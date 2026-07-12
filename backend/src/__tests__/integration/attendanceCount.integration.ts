/**
 * Attendance Count Integration Tests
 *
 * Tests for audience attendance count operations with section support.
 * Used for CO-24 reporting at assemblies and conventions.
 *
 * Test Coverage:
 *   - submitAttendanceCount: Record count for session/section (upserts)
 *   - updateAttendanceCount: Modify existing count
 *   - deleteAttendanceCount: Remove count record
 *   - sessionAttendanceCounts: Query all counts for a session
 *   - sessionTotalAttendance: Sum of all section counts
 *   - eventAttendanceSummary: Aggregated counts per session
 *
 * Section Support:
 *   Multiple counts per session with different sections (e.g., "A1", "B2").
 *   Unique constraint on [sessionId, section] - upsert updates existing.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestApp, closeTestApp } from '../setup.js';
import { createTestEvent, registerTestUser } from '../testHelpers.js';
import type { Application } from 'express';

describe('Attendance Count Operations', () => {
  let app: Application;
  let adminToken: string;
  let eventId: string;
  let sessionId: string;
  let attendanceCountId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const email = `attendance-test-${Date.now()}@example.com`;

    // Register user (overseer)
    adminToken = (await registerTestUser(app, {
      firstName: 'Attendance', lastName: 'Tester', isOverseer: true,
    })).accessToken;

    // Setup event and session
    eventId = await createTestEvent();

    // Purchase department to gain event access
    await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        query: `mutation($input: PurchaseDepartmentInput!) { purchaseDepartment(input: $input) { id } }`,
        variables: { input: { eventId, departmentType: 'ATTENDANT' } },
      });

    const sessionRes = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `mutation($eventId: ID!, $input: CreateSessionInput!) { createSession(eventId: $eventId, input: $input) { id } }`,
          variables: {
            eventId,
            input: {
              name: 'Attendance Session',
              date: '2026-03-19T00:00:00Z',
              startTime: '09:00',
              endTime: '12:00',
            },
          },
        });
    sessionId = sessionRes.body.data.createSession.id;
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('submitAttendanceCount', () => {
    it('should submit attendance count for a section', async () => {
      if (!sessionId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation Submit($input: SubmitAttendanceCountInput!) {
              submitAttendanceCount(input: $input) {
                id
                count
                section
                notes
              }
            }
          `,
          variables: {
            input: {
              sessionId,
              section: 'A1',
              count: 150,
              notes: 'Lower bowl section A1',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.submitAttendanceCount.count).toBe(150);
      expect(response.body.data.submitAttendanceCount.section).toBe('A1');

      attendanceCountId = response.body.data.submitAttendanceCount.id;
    });

    it('should submit attendance count for another section', async () => {
      if (!sessionId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation Submit($input: SubmitAttendanceCountInput!) {
              submitAttendanceCount(input: $input) {
                id
                count
                section
              }
            }
          `,
          variables: {
            input: {
              sessionId,
              section: 'B2',
              count: 200,
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.submitAttendanceCount.count).toBe(200);
      expect(response.body.data.submitAttendanceCount.section).toBe('B2');
    });
  });

  describe('sessionAttendanceCounts', () => {
    it('should return all attendance counts for session', async () => {
      if (!sessionId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            query SessionCounts($sessionId: ID!) {
              sessionAttendanceCounts(sessionId: $sessionId) {
                id
                count
                section
              }
            }
          `,
          variables: { sessionId },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.sessionAttendanceCounts.length).toBe(2);
    });
  });

  describe('sessionTotalAttendance', () => {
    it('should return total attendance for session', async () => {
      if (!sessionId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            query Total($sessionId: ID!) {
              sessionTotalAttendance(sessionId: $sessionId)
            }
          `,
          variables: { sessionId },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.sessionTotalAttendance).toBe(350); // 150 + 200
    });
  });

  describe('eventAttendanceSummary', () => {
    it('should return attendance summary for event', async () => {
      if (!eventId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            query Summary($eventId: ID!) {
              eventAttendanceSummary(eventId: $eventId) {
                session { name }
                totalCount
                sectionCounts { section count }
              }
            }
          `,
          variables: { eventId },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.eventAttendanceSummary.length).toBeGreaterThan(0);
    });
  });

  describe('updateAttendanceCount', () => {
    it('should update an attendance count', async () => {
      if (!attendanceCountId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation Update($id: ID!, $input: UpdateAttendanceCountInput!) {
              updateAttendanceCount(id: $id, input: $input) {
                id
                count
                notes
              }
            }
          `,
          variables: {
            id: attendanceCountId,
            input: { count: 175, notes: 'Updated count' },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.updateAttendanceCount.count).toBe(175);
    });
  });

  describe('deleteAttendanceCount', () => {
    it('should delete an attendance count', async () => {
      if (!attendanceCountId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation Delete($id: ID!) {
              deleteAttendanceCount(id: $id)
            }
          `,
          variables: { id: attendanceCountId },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.deleteAttendanceCount).toBe(true);
    });
  });
});
