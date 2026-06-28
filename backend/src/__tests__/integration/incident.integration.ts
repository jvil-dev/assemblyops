/**
 * Incident Integration Tests
 *
 * Tests the shared, department-aware safety-incident operations:
 *   - reportSafetyIncident: any department's volunteer can report (no ATTENDANT lock)
 *   - safetyIncidents: listing is scoped to the caller's department
 *   - resolveSafetyIncident: only the incident's department overseer may resolve
 *   - report -> list -> resolve happy path
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestApp, closeTestApp } from '../setup.js';
import { createTestEvent, createTestVolunteerUser, registerTestUser } from '../testHelpers.js';
import prisma from '../../config/database.js';
import type { Application } from 'express';

const REPORT = `mutation Report($input: ReportSafetyIncidentInput!) {
  reportSafetyIncident(input: $input) { id type description resolved }
}`;

const LIST = `query List($eventId: ID!, $resolved: Boolean) {
  safetyIncidents(eventId: $eventId, resolved: $resolved) { id type resolved }
}`;

const RESOLVE = `mutation Resolve($id: ID!, $resolutionNotes: String) {
  resolveSafetyIncident(id: $id, resolutionNotes: $resolutionNotes) { id resolved resolutionNotes }
}`;

async function purchaseDept(
  app: Application,
  token: string,
  eventId: string,
  departmentType: string
): Promise<string> {
  const res = await request(app)
    .post('/graphql')
    .set('Authorization', `Bearer ${token}`)
    .send({
      query: `mutation($input: PurchaseDepartmentInput!) { purchaseDepartment(input: $input) { id } }`,
      variables: { input: { eventId, departmentType } },
    });
  if (!res.body.data?.purchaseDepartment?.id) {
    throw new Error(`purchaseDept failed: ${JSON.stringify(res.body.errors)}`);
  }
  return res.body.data.purchaseDepartment.id;
}

describe('Incident Operations', () => {
  let app: Application;
  let attendantOverseerToken: string;
  let parkingOverseerToken: string;
  let eventId: string;
  let attendantDeptId: string;
  let parkingDeptId: string;
  let attendantVolToken: string;
  let parkingVolToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    eventId = await createTestEvent();

    // Attendant department + its overseer
    attendantOverseerToken = (
      await registerTestUser(app, { firstName: 'Att', lastName: 'Overseer', isOverseer: true })
    ).accessToken;
    attendantDeptId = await purchaseDept(app, attendantOverseerToken, eventId, 'ATTENDANT');

    // Parking department + a different overseer (proves the ATTENDANT lock is gone)
    parkingOverseerToken = (
      await registerTestUser(app, { firstName: 'Park', lastName: 'Overseer', isOverseer: true })
    ).accessToken;
    parkingDeptId = await purchaseDept(app, parkingOverseerToken, eventId, 'PARKING');

    // One volunteer in each department
    attendantVolToken = (await createTestVolunteerUser(app, eventId, attendantDeptId)).accessToken;
    parkingVolToken = (await createTestVolunteerUser(app, eventId, parkingDeptId)).accessToken;
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('lets a non-Attendant department volunteer report an incident', async () => {
    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${parkingVolToken}`)
      .send({
        query: REPORT,
        variables: {
          input: { eventId, type: 'UNSAFE_CONDITION', description: 'Icy patch in lot C' },
        },
      });

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.reportSafetyIncident.type).toBe('UNSAFE_CONDITION');
    expect(res.body.data.reportSafetyIncident.resolved).toBe(false);

    // Tagged with the reporter's (parking) department
    const inc = await prisma.safetyIncident.findUnique({
      where: { id: res.body.data.reportSafetyIncident.id },
      select: { departmentId: true },
    });
    expect(inc!.departmentId).toBe(parkingDeptId);
  });

  it('scopes listing to the caller department', async () => {
    // Attendant volunteer reports in the attendant department
    await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${attendantVolToken}`)
      .send({
        query: REPORT,
        variables: { input: { eventId, type: 'WET_FLOOR', description: 'Spill near door A' } },
      });

    // Attendant overseer sees attendant incidents, not parking's
    const attRes = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${attendantOverseerToken}`)
      .send({ query: LIST, variables: { eventId } });
    expect(attRes.body.errors).toBeUndefined();
    const attTypes = attRes.body.data.safetyIncidents.map((i: { type: string }) => i.type);
    expect(attTypes).toContain('WET_FLOOR');
    expect(attTypes).not.toContain('UNSAFE_CONDITION');

    // Parking overseer sees parking incidents, not attendant's
    const parkRes = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${parkingOverseerToken}`)
      .send({ query: LIST, variables: { eventId } });
    const parkTypes = parkRes.body.data.safetyIncidents.map((i: { type: string }) => i.type);
    expect(parkTypes).toContain('UNSAFE_CONDITION');
    expect(parkTypes).not.toContain('WET_FLOOR');
  });

  it('rejects resolution from a different department overseer, allows the right one', async () => {
    // Fresh attendant incident
    const reportRes = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${attendantVolToken}`)
      .send({
        query: REPORT,
        variables: {
          input: { eventId, type: 'MEDICAL_EMERGENCY', description: 'Fainting in seating' },
        },
      });
    const incidentId = reportRes.body.data.reportSafetyIncident.id;

    // Parking overseer cannot resolve an attendant incident
    const denied = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${parkingOverseerToken}`)
      .send({ query: RESOLVE, variables: { id: incidentId } });
    expect(denied.body.errors).toBeDefined();
    expect(denied.body.errors[0].message).toMatch(/overseer|access/i);

    // Attendant overseer resolves it
    const allowed = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${attendantOverseerToken}`)
      .send({ query: RESOLVE, variables: { id: incidentId, resolutionNotes: 'EMT handled' } });
    expect(allowed.body.errors).toBeUndefined();
    expect(allowed.body.data.resolveSafetyIncident.resolved).toBe(true);
    expect(allowed.body.data.resolveSafetyIncident.resolutionNotes).toBe('EMT handled');

    // It now appears in the attendant overseer's resolved=true list
    const listRes = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${attendantOverseerToken}`)
      .send({ query: LIST, variables: { eventId, resolved: true } });
    const ids = listRes.body.data.safetyIncidents.map((i: { id: string }) => i.id);
    expect(ids).toContain(incidentId);
  });
});
