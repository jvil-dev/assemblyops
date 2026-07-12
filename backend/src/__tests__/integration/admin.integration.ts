/**
 * Admin Integration Tests
 *
 * Tests for app-admin GraphQL operations (CSV imports + analytics).
 *
 * Test Setup:
 *   1. Register a user and set isAppAdmin = true via Prisma
 *   2. Login to get admin JWT
 *
 * Tests:
 *   - Authorization: non-admin & unauthenticated users get rejected
 *   - importCongregations: CSV import with auto-derived circuits
 *   - importEvents: CSV import creating Event records
 *   - importVolunteers: CSV import creating User + EventVolunteer records
 *   - appAnalytics: Aggregate counts
 *   - userGrowth: Time-series user data
 *   - eventStats: Per-event statistics
 */
import request from 'supertest';
import { createTestApp, closeTestApp } from '../setup.js';
import { createTestEvent, setAppAdmin, registerTestUser } from '../testHelpers.js';
import type { Application } from 'express';

let app: Application;

describe('Admin Operations', () => {
  let adminToken: string;
  let regularToken: string;
  const uid = Date.now(); // unique suffix for test data isolation

  beforeAll(async () => {
    app = await createTestApp();

    // Register an admin user
    const adminEmail = `admin-test-${Date.now()}@example.com`;
    await registerTestUser(app, {
      email: adminEmail, password: 'AdminPass123!',
      firstName: 'Admin', lastName: 'Tester', isOverseer: true,
    });

    // Set isAppAdmin
    await setAppAdmin(adminEmail);

    // Re-login to get a JWT with isAppAdmin claim
    const loginRes = await request(app)
      .post('/graphql')
      .send({
        query: `
          mutation Login($input: LoginUserInput!) {
            loginUser(input: $input) {
              accessToken
            }
          }
        `,
        variables: { input: { email: adminEmail, password: 'AdminPass123!' } },
      });

    if (loginRes.body.errors) {
      console.error('Admin login failed:', loginRes.body.errors);
      return;
    }
    adminToken = loginRes.body.data.loginUser.accessToken;

    // Register a regular (non-admin) user
    regularToken = (await registerTestUser(app, {
      firstName: 'Regular', lastName: 'User',
    })).accessToken;
  });

  afterAll(async () => {
    await closeTestApp();
  });

  // ─── AUTHORIZATION ─────────────────────────────────────────────

  describe('authorization', () => {
    it('should reject unauthenticated user on appAnalytics', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({
          query: `query { appAnalytics { totalUsers } }`,
        });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    });

    it('should reject non-admin user on appAnalytics', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          query: `query { appAnalytics { totalUsers } }`,
        });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('FORBIDDEN');
    });

    it('should reject non-admin user on importCongregations', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          query: `
            mutation Import($csvData: String!) {
              importCongregations(csvData: $csvData) {
                success
              }
            }
          `,
          variables: { csvData: 'name,state,circuitCode\nTest,MA,MA-01' },
        });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('FORBIDDEN');
    });
  });

  // ─── IMPORT CONGREGATIONS ─────────────────────────────────────

  describe('importCongregations', () => {
    it('should import valid congregations and auto-derive circuits', async () => {
      const csvData = [
        'name,state,circuitCode,language',
        `Test Cong Alpha ${uid},MA,TCIR-${uid}-01,en`,
        `Test Cong Beta ${uid},MA,TCIR-${uid}-01,en`,
        `Test Cong Gamma ${uid},NY,TCIR-${uid}-02,en`,
      ].join('\n');

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation Import($csvData: String!) {
              importCongregations(csvData: $csvData) {
                success
                created
                updated
                skipped
                totalRows
                errors { row field message }
              }
            }
          `,
          variables: { csvData },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      const result = response.body.data.importCongregations;
      expect(result.success).toBe(true);
      expect(result.created).toBe(3);
      expect(result.skipped).toBe(0);
      expect(result.totalRows).toBe(3);
    });

    it('should update existing congregations on re-import', async () => {
      const csvData = [
        'name,state,circuitCode,language',
        `Test Cong Alpha ${uid},MA,TCIR-${uid}-01,en`,
        `Test Cong Beta ${uid},MA,TCIR-${uid}-01,en`,
      ].join('\n');

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation Import($csvData: String!) {
              importCongregations(csvData: $csvData) {
                success
                created
                updated
              }
            }
          `,
          variables: { csvData },
        });

      const result = response.body.data.importCongregations;
      expect(result.success).toBe(true);
      expect(result.updated).toBe(2);
      expect(result.created).toBe(0);
    });

    it('should skip invalid rows with errors', async () => {
      const csvData = [
        'name,state,circuitCode',
        `,MA,TCIR-${uid}-01`,          // Missing name
        `Valid Cong ${uid},MA,TCIR-${uid}-01`,
      ].join('\n');

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation Import($csvData: String!) {
              importCongregations(csvData: $csvData) {
                success
                created
                skipped
                errors { row field message }
              }
            }
          `,
          variables: { csvData },
        });

      const result = response.body.data.importCongregations;
      expect(result.success).toBe(true);
      expect(result.skipped).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].row).toBe(2); // Row 2 (header is row 1)
    });

    it('should reject CSV with missing headers', async () => {
      const csvData = 'name,state\nTest,MA'; // Missing circuitCode

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation Import($csvData: String!) {
              importCongregations(csvData: $csvData) {
                success
                errors { row field message }
              }
            }
          `,
          variables: { csvData },
        });

      const result = response.body.data.importCongregations;
      expect(result.success).toBe(false);
      expect(result.errors[0].field).toBe('headers');
    });
  });

  // ─── IMPORT EVENTS ────────────────────────────────────────────

  describe('importEvents', () => {
    it('should import valid events', async () => {
      const csvData = [
        'eventType,circuitCode,region,serviceYear,name,theme,themeScripture,venue,address,startDate,endDate,language',
        `CIRCUIT_ASSEMBLY_CO,TCIR-${uid}-01,US-MA,2026,Import Assembly ${uid},Test Theme,John 1:1,Import Venue ${uid},123 Import St,2026-09-01,2026-09-01,en`,
        `REGIONAL_CONVENTION,,US-MA,2026,Import Convention ${uid},,,Import Conv Venue ${uid},456 Conv Ave,2026-07-01,2026-07-03,en`,
      ].join('\n');

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation Import($csvData: String!) {
              importEvents(csvData: $csvData) {
                success
                created
                updated
                skipped
                totalRows
                errors { row field message }
              }
            }
          `,
          variables: { csvData },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      const result = response.body.data.importEvents;
      expect(result.success).toBe(true);
      expect(result.created).toBe(2);
      expect(result.totalRows).toBe(2);
    });

    it('should update existing events on re-import', async () => {
      const csvData = [
        'eventType,circuitCode,region,serviceYear,name,theme,themeScripture,venue,address,startDate,endDate,language',
        `CIRCUIT_ASSEMBLY_CO,TCIR-${uid}-01,US-MA,2026,Import Assembly ${uid} Updated,Updated Theme,John 2:2,Import Venue ${uid},123 Import St,2026-09-01,2026-09-01,en`,
      ].join('\n');

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation Import($csvData: String!) {
              importEvents(csvData: $csvData) {
                success
                created
                updated
              }
            }
          `,
          variables: { csvData },
        });

      const result = response.body.data.importEvents;
      expect(result.success).toBe(true);
      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);
    });

    it('should reject CSV with missing required headers', async () => {
      const csvData = 'eventType,name\nCIRCUIT_ASSEMBLY_CO,Test'; // Missing many required headers

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation Import($csvData: String!) {
              importEvents(csvData: $csvData) {
                success
                errors { row field message }
              }
            }
          `,
          variables: { csvData },
        });

      const result = response.body.data.importEvents;
      expect(result.success).toBe(false);
      expect(result.errors[0].field).toBe('headers');
    });
  });

  // ─── IMPORT VOLUNTEERS ────────────────────────────────────────

  describe('importVolunteers', () => {
    let testEventId: string;

    beforeAll(async () => {
      testEventId = await createTestEvent({ name: 'Test Event Admin Vol Import' });
    });

    it('should import valid volunteers', async () => {
      const csvData = [
        'firstName,lastName,congregation,email',
        `John,Doe,Test Cong,test-vol-john-${uid}@example.com`,
        `Jane,Smith,Test Cong,test-vol-jane-${uid}@example.com`,
      ].join('\n');

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation Import($eventId: ID!, $csvData: String!) {
              importVolunteers(eventId: $eventId, csvData: $csvData) {
                success
                created
                skipped
                totalRows
                errors { row field message }
              }
            }
          `,
          variables: { eventId: testEventId, csvData },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      const result = response.body.data.importVolunteers;
      expect(result.success).toBe(true);
      expect(result.created).toBe(2);
      expect(result.totalRows).toBe(2);
    });

    it('should skip duplicate volunteers on re-import', async () => {
      // Same emails as above — dedup by email → same User → same EventVolunteer
      const csvData = [
        'firstName,lastName,congregation,email',
        `John,Doe,Test Cong,test-vol-john-${uid}@example.com`,
        `Jane,Smith,Test Cong,test-vol-jane-${uid}@example.com`,
      ].join('\n');

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation Import($eventId: ID!, $csvData: String!) {
              importVolunteers(eventId: $eventId, csvData: $csvData) {
                success
                created
                skipped
                errors { row field message }
              }
            }
          `,
          variables: { eventId: testEventId, csvData },
        });

      const result = response.body.data.importVolunteers;
      expect(result.success).toBe(true);
      expect(result.skipped).toBe(2);
      expect(result.created).toBe(0);
    });

    it('should reject import for non-existent event', async () => {
      const csvData = [
        'firstName,lastName,congregation',
        'Test,User,Test Cong',
      ].join('\n');

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation Import($eventId: ID!, $csvData: String!) {
              importVolunteers(eventId: $eventId, csvData: $csvData) {
                success
                errors { row field message }
              }
            }
          `,
          variables: { eventId: 'nonexistent-event-id', csvData },
        });

      const result = response.body.data.importVolunteers;
      expect(result.success).toBe(false);
      expect(result.errors[0].field).toBe('eventId');
    });
  });

  // ─── ANALYTICS ────────────────────────────────────────────────

  describe('appAnalytics', () => {
    it('should return aggregate counts', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            query {
              appAnalytics {
                totalUsers
                totalOverseers
                totalEvents
                totalVolunteers
                totalAssignments
                totalCheckIns
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      const analytics = response.body.data.appAnalytics;
      expect(analytics.totalUsers).toBeGreaterThanOrEqual(1);
      expect(analytics.totalEvents).toBeGreaterThanOrEqual(0);
      expect(typeof analytics.totalOverseers).toBe('number');
      expect(typeof analytics.totalVolunteers).toBe('number');
      expect(typeof analytics.totalAssignments).toBe('number');
      expect(typeof analytics.totalCheckIns).toBe('number');
    });
  });

  describe('userGrowth', () => {
    it('should return time-series data for 30d period', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            query Growth($period: String!) {
              userGrowth(period: $period) {
                date
                count
              }
            }
          `,
          variables: { period: '30d' },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(Array.isArray(response.body.data.userGrowth)).toBe(true);
      // We registered users in this test run, so there should be at least one data point
      expect(response.body.data.userGrowth.length).toBeGreaterThanOrEqual(1);

      const point = response.body.data.userGrowth[0];
      expect(point.date).toBeDefined();
      expect(typeof point.count).toBe('number');
    });
  });

  describe('eventStats', () => {
    it('should return per-event statistics', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            query {
              eventStats {
                eventId
                name
                eventType
                startDate
                volunteerCount
                departmentCount
                sessionCount
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(Array.isArray(response.body.data.eventStats)).toBe(true);
    });
  });
});
