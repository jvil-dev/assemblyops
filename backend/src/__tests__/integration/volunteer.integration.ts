/**
 * Volunteer Integration Tests
 *
 * Tests for volunteer-related GraphQL operations.
 * Volunteers are event participants who join via access code or by User ID.
 *
 * Test Setup:
 *   1. Register a new overseer user
 *   2. Create a test event via Prisma
 *   3. Purchase a department to gain event access
 *
 * Tests:
 *   - createVolunteer: Legacy admin-only flow (still supported)
 *   - addVolunteerByUserId: Primary overseer flow — add existing user by short ID
 *   - volunteers: Query event volunteers list
 *   - join requests: requestToJoinEvent, approveJoinRequest, denyJoinRequest
 *
 * Authorization:
 *   - Volunteer mutations require authenticated overseer with event access
 */
import request from 'supertest';
import { createTestApp, closeTestApp } from '../setup.js';
import { createTestEvent, registerTestUser, createTestCongregation } from '../testHelpers.js';
import type { Application } from 'express';

let app: Application;

describe('Volunteer Operations', () => {
  let accessToken: string;
  let eventId: string;
  let secondUserShortId: string; // 6-char userId of a second user for addVolunteerByUserId test

  beforeAll(async () => {
    app = await createTestApp();
    // Register overseer user
    accessToken = (await registerTestUser(app, {
      firstName: 'Vol', lastName: 'Tester', isOverseer: true,
    })).accessToken;

    // Create a test event directly via Prisma
    eventId = await createTestEvent();

    // Purchase a department to gain event access
    const purchaseRes = await request(app)
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
            departmentType: 'INFORMATION_VOLUNTEER_SERVICE',
          },
        },
      });

    if (purchaseRes.body.errors) {
      console.error('Purchase failed:', purchaseRes.body.errors);
    }

    // Register a second user (volunteer) to test addVolunteerByUserId
    const secondEmail = `vol-test-second-${Date.now()}@example.com`;
    const secondRegisterRes = await request(app)
      .post('/graphql')
      .send({
        query: `
          mutation Register($input: RegisterUserInput!) {
            registerUser(input: $input) {
              user {
                userId
              }
            }
          }
        `,
        variables: {
          input: {
            email: secondEmail,
            password: 'TestPassword123!',
            firstName: 'Second',
            lastName: 'Volunteer',
            isOverseer: false,
            congregationId: await createTestCongregation(),
          },
        },
      });

    if (!secondRegisterRes.body.errors) {
      secondUserShortId = secondRegisterRes.body.data.registerUser.user.userId;
    }
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('createVolunteer', () => {
    it('should create a volunteer with credentials', async () => {
      if (!eventId) {
        console.log('Skipping - no event available');
        return;
      }

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            mutation Create($eventId: ID!, $input: CreateVolunteerInput!) {
              createVolunteer(eventId: $eventId, input: $input) {
                id
                firstName
                lastName
                congregation
              }
            }
          `,
          variables: {
            eventId,
            input: {
              firstName: 'Test',
              lastName: 'Volunteer',
              congregation: `Vol Cong ${Date.now()}`,
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.createVolunteer.id).toBeDefined();
      expect(response.body.data.createVolunteer.firstName).toBe('Test');
      expect(response.body.data.createVolunteer.lastName).toBe('Volunteer');
      expect(response.body.data.createVolunteer.congregation).toBeDefined();
    });
  });

  describe('addVolunteerByUserId', () => {
    it('should add an existing user to the event by their short userId', async () => {
      if (!eventId || !secondUserShortId) {
        console.log('Skipping - no event or second user available');
        return;
      }

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            mutation AddByUserId($eventId: ID!, $userId: String!) {
              addVolunteerByUserId(eventId: $eventId, userId: $userId) {
                id
                user {
                  firstName
                  lastName
                }
              }
            }
          `,
          variables: {
            eventId,
            userId: secondUserShortId,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      const result = response.body.data.addVolunteerByUserId;
      expect(result.id).toBeDefined();
      expect(result.user.firstName).toBe('Second');
    });

    it('should reject adding the same user twice to the same event', async () => {
      if (!eventId || !secondUserShortId) {
        console.log('Skipping - no event or second user available');
        return;
      }

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            mutation AddByUserId($eventId: ID!, $userId: String!) {
              addVolunteerByUserId(eventId: $eventId, userId: $userId) {
                id
              }
            }
          `,
          variables: {
            eventId,
            userId: secondUserShortId,
          },
        });

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('volunteers', () => {
    it('should return event volunteers', async () => {
      if (!eventId) {
        console.log('Skipping - no event available');
        return;
      }

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            query Volunteers($eventId: ID!) {
              volunteers(eventId: $eventId) {
                id
                firstName
                lastName
                congregation
              }
            }
          `,
          variables: { eventId },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(Array.isArray(response.body.data.volunteers)).toBe(true);
    });
  });

  describe('join requests', () => {
    let requestUserToken: string;
    let joinRequestId: string;

    beforeAll(async () => {
      // Register a third user who will request to join
      requestUserToken = (await registerTestUser(app, {
        firstName: 'Join', lastName: 'Requester',
      })).accessToken;
    });

    it('should allow a user to request to join an event', async () => {
      if (!requestUserToken || !eventId) {
        console.log('Skipping - setup incomplete');
        return;
      }

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${requestUserToken}`)
        .send({
          query: `
            mutation Request($eventId: ID!) {
              requestToJoinEvent(eventId: $eventId) {
                id
                status
              }
            }
          `,
          variables: { eventId },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.requestToJoinEvent.status).toBe('PENDING');
      joinRequestId = response.body.data.requestToJoinEvent.id;
    });

    it('should allow the overseer to approve the join request', async () => {
      if (!joinRequestId) {
        console.log('Skipping - no join request created');
        return;
      }

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            mutation Approve($requestId: ID!) {
              approveJoinRequest(requestId: $requestId) {
                id
              }
            }
          `,
          variables: { requestId: joinRequestId },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.approveJoinRequest.id).toBeDefined();
    });

    it('should allow the overseer to deny a join request', async () => {
      // Register a fresh user and submit a new request to deny
      const denyUserToken = (await registerTestUser(app, {
        firstName: 'Deny', lastName: 'Requester',
      })).accessToken;

      const reqRes = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${denyUserToken}`)
        .send({
          query: `
            mutation Request($eventId: ID!) {
              requestToJoinEvent(eventId: $eventId) {
                id
              }
            }
          `,
          variables: { eventId },
        });
      const denyRequestId = reqRes.body.data.requestToJoinEvent.id;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            mutation Deny($requestId: ID!, $reason: String) {
              denyJoinRequest(requestId: $requestId, reason: $reason) {
                id
                status
              }
            }
          `,
          variables: { requestId: denyRequestId, reason: 'No capacity' },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.denyJoinRequest.status).toBe('DENIED');
    });
  });
});
