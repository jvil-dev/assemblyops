/**
 * Session Integration Tests
 *
 * Tests for session-related GraphQL operations.
 * Sessions are event-wide time blocks (e.g., "Saturday Morning", "Sunday Afternoon").
 * All departments share the same sessions within an event.
 *
 * Test Setup:
 *   1. Register a new overseer user
 *   2. Create a test event via Prisma
 *   3. Purchase a department (creates sessions on first purchase)
 *
 * Tests:
 *   - createSession: Create single session with name, date, startTime, endTime
 *   - createSessions: Bulk create multiple sessions in one mutation
 *   - sessions: Query sessions by eventId with assignmentCount
 *
 * Authorization:
 *   Session mutations require authenticated overseer with event access.
 */
import request from 'supertest';
import { createTestApp, closeTestApp } from '../setup.js';
import { createTestEvent, registerTestUser } from '../testHelpers.js';
import type { Application } from 'express';

let app: Application;

describe('Session Operations', () => {
  let accessToken: string;
  let eventId: string;

  beforeAll(async () => {
    app = await createTestApp();
    // Register overseer user
    accessToken = (await registerTestUser(app, {
      firstName: 'Session', lastName: 'Tester', isOverseer: true,
    })).accessToken;

    // Create a test event directly via Prisma
    eventId = await createTestEvent();

    // Purchase a department to gain event access (also auto-creates sessions)
    await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        query: `
          mutation Purchase($input: PurchaseDepartmentInput!) {
            purchaseDepartment(input: $input) {
              id
            }
          }
        `,
        variables: {
          input: {
            eventId,
            departmentType: 'ACCOUNTS',
          },
        },
      });
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('createSession', () => {
    it('should create a session', async () => {
      if (!eventId) {
        console.log('Skipping - no event available');
        return;
      }

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            mutation CreateSession($eventId: ID!, $input: CreateSessionInput!) {
              createSession(eventId: $eventId, input: $input) {
                id
                name
                date
                startTime
                endTime
              }
            }
          `,
          variables: {
            eventId,
            input: {
              name: 'Saturday Morning',
              date: '2026-03-07T00:00:00Z',
              startTime: '09:00',
              endTime: '12:00',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.createSession.name).toBe('Saturday Morning');
    });
  });

  describe('createSessions', () => {
    it('should bulk create sessions', async () => {
      if (!eventId) {
        console.log('Skipping - no event available');
        return;
      }

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            mutation CreateSessions($input: CreateSessionsInput!) {
              createSessions(input: $input) {
                id
                name
              }
            }
          `,
          variables: {
            input: {
              eventId,
              sessions: [
                {
                  name: 'Saturday Afternoon',
                  date: '2026-03-07T00:00:00Z',
                  startTime: '13:30',
                  endTime: '16:30',
                },
              ],
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.createSessions.length).toBe(1);
    });
  });

  describe('sessions', () => {
    it('should return event sessions', async () => {
      if (!eventId) {
        console.log('Skipping - no event available');
        return;
      }

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            query Sessions($eventId: ID!) {
              sessions(eventId: $eventId) {
                id
                name
                date
                startTime
                endTime
                assignmentCount
              }
            }
          `,
          variables: { eventId },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(Array.isArray(response.body.data.sessions)).toBe(true);
    });
  });
});
