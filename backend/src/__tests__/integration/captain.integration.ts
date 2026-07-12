/**
 * Captain Role Integration Tests
 *
 * Tests for captain designation and group check-in capabilities.
 *
 * Test Coverage:
 *   - setCaptain: Overseer designates assignment as captain
 *   - captainGroup: Returns volunteers at same post/session
 *   - captainCheckIn: Captain can check in group members
 *
 * Captain Role:
 *   Captains are group leaders who can check in volunteers without phones.
 *   A captain can only check in volunteers assigned to the same post/session.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestApp, closeTestApp } from '../setup.js';
import { createTestEvent, createTestVolunteerUser, registerTestUser } from '../testHelpers.js';
import type { Application } from 'express';

describe('Captain Operations', () => {
  let app: Application;
  let adminToken: string;
  let captainToken: string;
  // memberToken reserved for future test: verify members can't perform captain operations
  let eventId: string;
  let departmentId: string;
  let captainVolunteerId: string;
  let memberVolunteerId: string;
  let postId: string;
  let sessionId: string;
  let captainAssignmentId: string;
  let memberAssignmentId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const email = `captain-test-${Date.now()}@example.com`;

    // Register user (overseer)
    adminToken = (await registerTestUser(app, {
      firstName: 'Captain', lastName: 'Tester', isOverseer: true,
    })).accessToken;

    // Create a test event directly via Prisma
    eventId = await createTestEvent();

    // Purchase a department to gain event access
    const purchaseRes = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        query: `mutation($input: PurchaseDepartmentInput!) { purchaseDepartment(input: $input) { id } }`,
        variables: { input: { eventId, departmentType: 'ATTENDANT' } },
      });
    departmentId = purchaseRes.body.data.purchaseDepartment.id;

    const postRes = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        query: `mutation($departmentId: ID!, $input: CreatePostInput!) { createPost(departmentId: $departmentId, input: $input) { id } }`,
        variables: {
          departmentId,
          input: { name: 'Captain Post' },
        },
      });
    postId = postRes.body.data.createPost.id;

    const sessionRes = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        query: `mutation($eventId: ID!, $input: CreateSessionInput!) { createSession(eventId: $eventId, input: $input) { id } }`,
        variables: {
          eventId,
          input: {
            name: 'Captain Session',
            date: '2026-03-18T00:00:00Z',
            startTime: '09:00',
            endTime: '12:00',
          },
        },
      });
    sessionId = sessionRes.body.data.createSession.id;

    // Create captain volunteer user (registers User + creates EventVolunteer in department)
    const captainResult = await createTestVolunteerUser(app, eventId, departmentId);
    captainToken = captainResult.accessToken;
    captainVolunteerId = captainResult.eventVolunteerId;

    // Create member volunteer user (registers User + creates EventVolunteer in department)
    const memberResult = await createTestVolunteerUser(app, eventId, departmentId);
    // memberResult.accessToken reserved for future test: verify members can't perform captain operations
    memberVolunteerId = memberResult.eventVolunteerId;

    // Create assignments (force-assign to skip acceptance flow for test setup)
    const captainAssignRes = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        query: `mutation($input: ForceAssignmentInput!) { forceAssignment(input: $input) { assignment { id } } }`,
        variables: {
          input: { volunteerId: captainVolunteerId, postId, sessionId, isCaptain: true },
        },
      });
    captainAssignmentId = captainAssignRes.body.data.forceAssignment.assignment.id;

    const memberAssignRes = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        query: `mutation($input: ForceAssignmentInput!) { forceAssignment(input: $input) { assignment { id } } }`,
        variables: {
          input: { volunteerId: memberVolunteerId, postId, sessionId },
        },
      });
    memberAssignmentId = memberAssignRes.body.data.forceAssignment.assignment.id;
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('setCaptain', () => {
    it('should set captain status on assignment', async () => {
      if (!captainAssignmentId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation SetCaptain($input: SetCaptainInput!) {
              setCaptain(input: $input) {
                id
                isCaptain
              }
            }
          `,
          variables: {
            input: { assignmentId: captainAssignmentId, isCaptain: true },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.setCaptain.isCaptain).toBe(true);
    });
  });

  describe('captainGroup', () => {
    it('should return captain group members', async () => {
      if (!captainToken || !postId || !sessionId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${captainToken}`)
        .send({
          query: `
            query CaptainGroup($postId: ID!, $sessionId: ID!) {
              captainGroup(postId: $postId, sessionId: $sessionId) {
                captain { id isCaptain }
                members { id volunteer { firstName } checkIn { id } }
              }
            }
          `,
          variables: { postId, sessionId },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.captainGroup.captain.isCaptain).toBe(true);
      expect(response.body.data.captainGroup.members.length).toBeGreaterThan(0);
    });
  });

  describe('captainCheckIn', () => {
    it('should allow captain to check in a group member', async () => {
      if (!captainToken || !memberAssignmentId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${captainToken}`)
        .send({
          query: `
            mutation CaptainCheckIn($input: CaptainCheckInInput!) {
              captainCheckIn(input: $input) {
                id
                checkIn {
                  id
                  notes
                  status
                }
              }
            }
          `,
          variables: {
            input: { assignmentId: memberAssignmentId, notes: 'No phone' },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.captainCheckIn.checkIn).not.toBeNull();
      expect(response.body.data.captainCheckIn.checkIn.notes).toContain('captain');
    });
  });
});
