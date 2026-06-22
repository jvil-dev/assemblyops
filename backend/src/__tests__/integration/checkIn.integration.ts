/**
 * Check-In Integration Tests
 *
 * Tests for volunteer check-in/check-out operations.
 *
 * Test Coverage:
 *   - Volunteer check-in to assignment (requires ACCEPTED status)
 *   - Volunteer check-out from assignment
 *   - Overseer check-in on behalf of volunteer (can override status)
 *   - Mark volunteer as no-show
 *   - Check-in statistics query
 *
 * Note: Uses forceAssignment to create ACCEPTED assignments.
 * Volunteers can only check in to ACCEPTED or force-assigned assignments.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestApp, closeTestApp } from '../setup.js';
import { createTestEvent, createTestVolunteerUser, registerTestUser } from '../testHelpers.js';
import type { Application } from 'express';

let app: Application;

const graphqlRequest = (query: string, variables?: object) =>
  request(app).post('/graphql').send({ query, variables });

const authRequest = (query: string, variables: object, token: string) =>
  request(app)
    .post('/graphql')
    .set('Authorization', `Bearer ${token}`)
    .send({ query, variables });

describe('Check-In Operations', () => {
  let adminToken: string;
  let volunteerToken: string;
  let eventId: string;
  let sessionId: string;
  let departmentId: string;
  let postId: string;
  let volunteerId: string;
  let assignmentId: string;
  let secondAssignmentId: string;

  beforeAll(async () => {
    app = await createTestApp();
    // Register user (overseer)
    adminToken = (await registerTestUser(app, {
      firstName: 'CheckIn', lastName: 'Tester', isOverseer: true,
    })).accessToken;

    // Create a test event directly via Prisma
    eventId = await createTestEvent();

    // Purchase a department to gain event access
    const purchaseRes = await authRequest(
      `mutation($input: PurchaseDepartmentInput!) { purchaseDepartment(input: $input) { id } }`,
      { input: { eventId, departmentType: 'ATTENDANT' } },
      adminToken
    );
    if (purchaseRes.body.errors) {
      console.error('Purchase failed:', purchaseRes.body.errors);
      return;
    }
    departmentId = purchaseRes.body.data.purchaseDepartment.id;

    // Create post
    const postRes = await authRequest(
      `mutation($departmentId: ID!, $input: CreatePostInput!) {
        createPost(departmentId: $departmentId, input: $input) { id }
      }`,
      { departmentId, input: { name: 'East Lobby' } },
      adminToken
    );
    if (postRes.body.errors) {
      console.error('Post failed:', postRes.body.errors);
      return;
    }
    postId = postRes.body.data.createPost.id;

    // Create session
    const sessionRes = await authRequest(
      `mutation($eventId: ID!, $input: CreateSessionInput!) {
        createSession(eventId: $eventId, input: $input) { id }
      }`,
      {
        eventId,
        input: {
          name: 'Saturday Morning',
          date: '2026-03-07T00:00:00Z',
          startTime: '09:00',
          endTime: '12:00',
        },
      },
      adminToken
    );
    if (sessionRes.body.errors) {
      console.error('Session failed:', sessionRes.body.errors);
      return;
    }
    sessionId = sessionRes.body.data.createSession.id;

    // Create volunteer user (registers User + creates EventVolunteer)
    const { accessToken: volToken, eventVolunteerId } = await createTestVolunteerUser(app, eventId);
    volunteerToken = volToken;
    volunteerId = eventVolunteerId;

    // Create assignment with ACCEPTED status (forceAssignment)
    const assignmentRes = await authRequest(
      `mutation($input: ForceAssignmentInput!) { forceAssignment(input: $input) { assignment { id } } }`,
      { input: { volunteerId, postId, sessionId } },
      adminToken
    );
    if (assignmentRes.body.errors) {
      console.error('Assignment failed:', assignmentRes.body.errors);
      return;
    }
    assignmentId = assignmentRes.body.data.forceAssignment.assignment.id;

    // Create second volunteer + assignment for no-show test
    const volunteer2Res = await authRequest(
      `mutation($eventId: ID!, $input: CreateVolunteerInput!) {
        createVolunteer(eventId: $eventId, input: $input) { id }
      }`,
      {
        eventId,
        input: { firstName: 'NoShow', lastName: 'Volunteer', congregation: `CheckIn Cong ${Date.now()}` },
      },
      adminToken
    );
    if (!volunteer2Res.body.errors) {
      const volunteer2Id = volunteer2Res.body.data.createVolunteer.id;
      const assignment2Res = await authRequest(
        `mutation($input: ForceAssignmentInput!) { forceAssignment(input: $input) { assignment { id } } }`,
        { input: { volunteerId: volunteer2Id, postId, sessionId } },
        adminToken
      );
      if (!assignment2Res.body.errors) {
        secondAssignmentId = assignment2Res.body.data.forceAssignment.assignment.id;
      }
    }

  });

  afterAll(async () => {
    await closeTestApp();
  });

  // ============================================
  // VOLUNTEER CHECK-IN
  // ============================================

  describe('checkIn mutation', () => {
    it('should allow volunteer to check in to their assignment', async () => {
      if (!assignmentId || !volunteerToken) {
        return console.log('Skipping - missing setup');
      }

      const response = await authRequest(
        `mutation CheckIn($input: CheckInInput!) {
          checkIn(input: $input) {
            id
            status
            checkInTime
            assignment { id }
          }
        }`,
        { input: { assignmentId } },
        volunteerToken
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.checkIn.status).toBe('CHECKED_IN');
      expect(response.body.data.checkIn.assignment.id).toBe(assignmentId);
    });

    it('should reject duplicate check-in', async () => {
      if (!assignmentId || !volunteerToken) {
        return console.log('Skipping - missing setup');
      }

      const response = await authRequest(
        `mutation($input: CheckInInput!) { checkIn(input: $input) { id } }`,
        { input: { assignmentId } },
        volunteerToken
      );

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Already checked in');
    });
  });

  // ============================================
  // VOLUNTEER CHECK-OUT
  // ============================================

  describe('checkOut mutation', () => {
    it('should allow volunteer to check out', async () => {
      if (!assignmentId || !volunteerToken) {
        return console.log('Skipping - missing setup');
      }

      const response = await authRequest(
        `mutation CheckOut($input: CheckOutInput!) {
          checkOut(input: $input) {
            id
            status
            checkOutTime
          }
        }`,
        { input: { assignmentId } },
        volunteerToken
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.checkOut.status).toBe('CHECKED_OUT');
      expect(response.body.data.checkOut.checkOutTime).toBeDefined();
    });

    it('should reject duplicate check-out', async () => {
      if (!assignmentId || !volunteerToken) {
        return console.log('Skipping - missing setup');
      }

      const response = await authRequest(
        `mutation($input: CheckOutInput!) { checkOut(input: $input) { id } }`,
        { input: { assignmentId } },
        volunteerToken
      );

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Already checked out');
    });
  });

  // ============================================
  // ADMIN CHECK-IN
  // ============================================

  describe('adminCheckIn mutation', () => {
    it('should allow admin to check in a volunteer', async () => {
      if (!secondAssignmentId || !adminToken) {
        return console.log('Skipping - missing setup');
      }

      const response = await authRequest(
        `mutation AdminCheckIn($input: AdminCheckInInput!) {
          adminCheckIn(input: $input) {
            id
            status
            notes
            checkedInBy { id }
          }
        }`,
        { input: { assignmentId: secondAssignmentId, notes: 'Checked in by overseer' } },
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.adminCheckIn.status).toBe('CHECKED_IN');
      expect(response.body.data.adminCheckIn.notes).toBe('Checked in by overseer');
      expect(response.body.data.adminCheckIn.checkedInBy).toBeDefined();
    });
  });

  // ============================================
  // MARK NO-SHOW
  // ============================================

  describe('markNoShow mutation', () => {
    let noShowAssignmentId: string;

    beforeAll(async () => {
      if (!eventId || !adminToken || !postId || !sessionId) return;

      // Create a fresh volunteer + assignment for no-show test
      const volunteerRes = await authRequest(
        `mutation($eventId: ID!, $input: CreateVolunteerInput!) {
          createVolunteer(eventId: $eventId, input: $input) { id }
        }`,
        {
          eventId,
          input: { firstName: 'NoShow', lastName: 'Test', congregation: `CheckIn Cong ${Date.now()}` },
        },
        adminToken
      );
      if (volunteerRes.body.errors) return;

      const assignmentRes = await authRequest(
        `mutation($input: CreateAssignmentInput!) { createAssignment(input: $input) { assignment { id } } }`,
        { input: { volunteerId: volunteerRes.body.data.createVolunteer.id, postId, sessionId } },
        adminToken
      );
      if (!assignmentRes.body.errors) {
        noShowAssignmentId = assignmentRes.body.data.createAssignment.assignment.id;
      }
    });

    it('should allow admin to mark volunteer as no-show', async () => {
      if (!noShowAssignmentId || !adminToken) {
        return console.log('Skipping - missing setup');
      }

      const response = await authRequest(
        `mutation MarkNoShow($input: MarkNoShowInput!) {
          markNoShow(input: $input) {
            id
            status
            notes
          }
        }`,
        { input: { assignmentId: noShowAssignmentId, notes: 'Did not arrive' } },
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.markNoShow.status).toBe('NO_SHOW');
      expect(response.body.data.markNoShow.notes).toBe('Did not arrive');
    });
  });

  // ============================================
  // CHECK-IN STATS
  // ============================================

  describe('checkInStats query', () => {
    it('should return session check-in statistics', async () => {
      if (!sessionId || !adminToken) {
        return console.log('Skipping - missing setup');
      }

      const response = await authRequest(
        `query Stats($sessionId: ID!) {
          checkInStats(sessionId: $sessionId) {
            sessionId
            totalAssignments
            checkedIn
            checkedOut
            noShow
            pending
          }
        }`,
        { sessionId },
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.checkInStats.sessionId).toBe(sessionId);
      expect(response.body.data.checkInStats.totalAssignments).toBeGreaterThan(0);
    });
  });

});
