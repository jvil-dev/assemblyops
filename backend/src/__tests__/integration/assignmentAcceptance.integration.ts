/**
 * Assignment Acceptance Integration Tests
 *
 * Tests for assignment acceptance workflow and status filtering.
 *
 * Test Coverage:
 *   - createAssignment: Creates with PENDING status
 *   - acceptAssignment: Volunteer accepts → ACCEPTED
 *   - declineAssignment: Volunteer declines → DECLINED with optional reason
 *   - forceAssignment: Admin force-assigns → ACCEPTED + forceAssigned flag
 *   - pendingAssignments: Query filters by PENDING status
 *   - declinedAssignments: Query returns DECLINED assignments
 *   - checkIn blocked for PENDING (volunteer)
 *   - adminCheckIn allowed on PENDING (admin override)
 *   - departmentCoverage only shows ACCEPTED assignments
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestApp, closeTestApp } from '../setup.js';
import { createTestEvent, createTestVolunteerUser, registerTestUser } from '../testHelpers.js';
import type { Application } from 'express';

describe('Assignment Acceptance Operations', () => {
  let app: Application;
  let adminToken: string;
  let volunteerToken: string;
  let eventId: string;
  let departmentId: string;
  let volunteerId: string;
  let postId: string;
  let sessionId: string;
  let assignmentId: string;

  beforeAll(async () => {
    app = await createTestApp();
    // Register user (overseer)
    adminToken = (await registerTestUser(app, {
      firstName: 'Accept', lastName: 'Tester', isOverseer: true,
    })).accessToken;

    // Setup event, department, volunteer, post, session
    eventId = await createTestEvent();

    // Purchase department (creates EventAdmin + Department)
    const purchaseRes = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        query: `mutation($input: PurchaseDepartmentInput!) { purchaseDepartment(input: $input) { id } }`,
        variables: { input: { eventId, departmentType: 'ATTENDANT' } },
      });
    departmentId = purchaseRes.body.data.purchaseDepartment.id;

    // Create post
      const postRes = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `mutation($departmentId: ID!, $input: CreatePostInput!) { createPost(departmentId: $departmentId, input: $input) { id } }`,
          variables: {
            departmentId,
            input: { name: 'Test Post' },
          },
        });
      postId = postRes.body.data.createPost.id;

      // Create session
      const sessionRes = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `mutation($eventId: ID!, $input: CreateSessionInput!) { createSession(eventId: $eventId, input: $input) { id } }`,
          variables: {
            eventId,
            input: {
              name: 'Test Session',
              date: '2026-03-15T00:00:00Z',
              startTime: '09:00',
              endTime: '12:00',
            },
          },
        });
      sessionId = sessionRes.body.data.createSession.id;

      // Create volunteer user (registers User + creates EventVolunteer in department)
      const { accessToken: volToken, eventVolunteerId } = await createTestVolunteerUser(app, eventId, departmentId);
      volunteerToken = volToken;
      volunteerId = eventVolunteerId;
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('createAssignment with PENDING status', () => {
    it('should create assignment with PENDING status', async () => {
      if (!volunteerId || !postId || !sessionId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation CreateAssignment($input: CreateAssignmentInput!) {
              createAssignment(input: $input) {
                assignment {
                  id
                  status
                  isCaptain
                  forceAssigned
                }
                warning
              }
            }
          `,
          variables: {
            input: { volunteerId, postId, sessionId },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.createAssignment.assignment.status).toBe('PENDING');
      expect(response.body.data.createAssignment.assignment.forceAssigned).toBe(false);

      assignmentId = response.body.data.createAssignment.assignment.id;
    });
  });

  describe('acceptAssignment', () => {
    it('should accept a pending assignment', async () => {
      if (!volunteerToken || !assignmentId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          query: `
            mutation Accept($input: AcceptAssignmentInput!) {
              acceptAssignment(input: $input) {
                id
                status
                respondedAt
              }
            }
          `,
          variables: {
            input: { assignmentId },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.acceptAssignment.status).toBe('ACCEPTED');
      expect(response.body.data.acceptAssignment.respondedAt).not.toBeNull();
    });
  });

  describe('declineAssignment', () => {
    it('should decline a pending assignment', async () => {
      if (!volunteerId || !postId || !sessionId || !volunteerToken) return;

      // Create another session for new assignment
      const sessionRes = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `mutation($eventId: ID!, $input: CreateSessionInput!) { createSession(eventId: $eventId, input: $input) { id } }`,
          variables: {
            eventId,
            input: {
              name: 'Test Session 2',
              date: '2026-03-16T00:00:00Z',
              startTime: '09:00',
              endTime: '12:00',
            },
          },
        });
      const newSessionId = sessionRes.body.data.createSession.id;

      // Create new assignment
      const createRes = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `mutation($input: CreateAssignmentInput!) { createAssignment(input: $input) { assignment { id } } }`,
          variables: {
            input: { volunteerId, postId, sessionId: newSessionId },
          },
        });
      const newAssignmentId = createRes.body.data.createAssignment.assignment.id;

      // Decline
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          query: `
            mutation Decline($input: DeclineAssignmentInput!) {
              declineAssignment(input: $input) {
                id
                status
                declineReason
              }
            }
          `,
          variables: {
            input: { assignmentId: newAssignmentId, reason: 'Prior commitment' },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.declineAssignment.status).toBe('DECLINED');
      expect(response.body.data.declineAssignment.declineReason).toBe('Prior commitment');
    });
  });

  describe('forceAssignment', () => {
    it('should force-assign with ACCEPTED status', async () => {
      if (!volunteerId || !postId) return;

      // Create another session
      const sessionRes = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `mutation($eventId: ID!, $input: CreateSessionInput!) { createSession(eventId: $eventId, input: $input) { id } }`,
          variables: {
            eventId,
            input: {
              name: 'Force Session',
              date: '2026-03-17T00:00:00Z',
              startTime: '09:00',
              endTime: '12:00',
            },
          },
        });
      const forceSessionId = sessionRes.body.data.createSession.id;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation Force($input: ForceAssignmentInput!) {
              forceAssignment(input: $input) {
                assignment {
                  id
                  status
                  forceAssigned
                }
                warning
              }
            }
          `,
          variables: {
            input: { volunteerId, postId, sessionId: forceSessionId },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.forceAssignment.assignment.status).toBe('ACCEPTED');
      expect(response.body.data.forceAssignment.assignment.forceAssigned).toBe(true);
    });
  });

  describe('pendingAssignments', () => {
    it('should return pending assignments for event', async () => {
      if (!eventId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            query Pending($filter: PendingAssignmentsFilter) {
              pendingAssignments(filter: $filter) {
                id
                status
              }
            }
          `,
          variables: {
            filter: { eventId, status: 'PENDING' },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      // All returned should be PENDING
      response.body.data.pendingAssignments.forEach((a: { status: string }) => {
        expect(a.status).toBe('PENDING');
      });
    });
  });

  describe('declinedAssignments', () => {
    it('should return declined assignments', async () => {
      if (!eventId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            query Declined($eventId: ID) {
              declinedAssignments(eventId: $eventId) {
                id
                status
                declineReason
              }
            }
          `,
          variables: { eventId },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.declinedAssignments.length).toBeGreaterThan(0);
      response.body.data.declinedAssignments.forEach((a: { status: string }) => {
        expect(a.status).toBe('DECLINED');
      });
    });
  });

  describe('checkIn with PENDING assignment', () => {
    let pendingAssignmentId: string;
    let pendingSessionId: string;

    beforeAll(async () => {
      if (!eventId) return;

      // Create a new session for PENDING check-in tests
      const sessionRes = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `mutation($eventId: ID!, $input: CreateSessionInput!) {
            createSession(eventId: $eventId, input: $input) { id }
          }`,
          variables: {
            eventId,
            input: {
              name: 'Pending CheckIn Session',
              date: '2026-03-25T00:00:00Z',
              startTime: '14:00',
              endTime: '17:00',
            },
          },
        });
      pendingSessionId = sessionRes.body.data.createSession.id;

      // Create a PENDING assignment (not accepted)
      const assignRes = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `mutation($input: CreateAssignmentInput!) {
            createAssignment(input: $input) { assignment { id status } }
          }`,
          variables: {
            input: { volunteerId, postId, sessionId: pendingSessionId },
          },
        });
      pendingAssignmentId = assignRes.body.data.createAssignment.assignment.id;
    });

    it('should reject volunteer check-in for PENDING assignment', async () => {
      if (!pendingAssignmentId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          query: `mutation CheckIn($input: CheckInInput!) {
            checkIn(input: $input) { id status }
          }`,
          variables: { input: { assignmentId: pendingAssignmentId } },
        });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('not been accepted');
    });

    it('should allow admin to check in PENDING assignment via adminCheckIn', async () => {
      if (!pendingAssignmentId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `mutation AdminCheckIn($input: AdminCheckInInput!) {
            adminCheckIn(input: $input) { id status }
          }`,
          variables: { input: { assignmentId: pendingAssignmentId } },
        });

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.adminCheckIn.status).toBe('CHECKED_IN');
    });
  });

  describe('departmentCoverage with status filtering', () => {
    it('should only include ACCEPTED assignments in coverage', async () => {
      if (!departmentId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `query Coverage($departmentId: ID!) {
            departmentCoverage(departmentId: $departmentId) {
              post { id name }
              session { id name }
              filled
              assignments { id status }
            }
          }`,
          variables: { departmentId },
        });

      expect(response.body.errors).toBeUndefined();
      // Verify coverage returns ACCEPTED + PENDING assignments
      // but filled only counts ACCEPTED
      const slots = response.body.data.departmentCoverage;
      expect(Array.isArray(slots)).toBe(true);
      // Each slot's filled count should match ACCEPTED assignments only
      slots.forEach((slot: { filled: number; assignments: { id: string; status: string }[] }) => {
        const acceptedCount = slot.assignments.filter((a) => a.status === 'ACCEPTED').length;
        expect(slot.filled).toBe(acceptedCount);
      });
    });
  });
});
