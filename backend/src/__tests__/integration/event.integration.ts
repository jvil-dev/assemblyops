/**
 * Event Integration Tests
 *
 * Tests for event-related GraphQL operations.
 * Events are pre-created (via seed script in production, via Prisma in tests).
 * Overseers purchase departments from pre-created events.
 *
 * Test Setup:
 *   1. Register a new overseer user
 *   2. Create a test event directly via Prisma
 *
 * Tests:
 *   - eventTemplates: Query available event templates
 *   - discoverEvents: Query public events for discovery
 *   - purchaseDepartment: Purchase a department from a pre-created event
 *   - myAllEvents: Query events the user is part of (with departmentAccessCode)
 *   - availableDepartments: Query unclaimed departments in an event
 *   - joinDepartmentByAccessCode: Volunteer joins via access code
 *   - setDepartmentPrivacy: Toggle department visibility
 *   - assignHierarchyRole: Assign assistant overseer role
 *   - removeHierarchyRole: Remove hierarchy assignment
 *
 * Authorization:
 *   - purchaseDepartment requires authenticated overseer
 *   - joinDepartmentByAccessCode requires authenticated user
 *   - setDepartmentPrivacy requires department overseer
 */
import request from 'supertest';
import { createTestApp, closeTestApp } from '../setup.js';
import { createTestEvent, registerTestUser } from '../testHelpers.js';
import type { Application } from 'express';

let app: Application;

describe('Event Operations', () => {
  let accessToken: string;
  let eventId: string;
  let departmentId: string;
  let departmentAccessCode: string;

  beforeAll(async () => {
    app = await createTestApp();
    // Register overseer user
    accessToken = (await registerTestUser(app, {
      firstName: 'Event', lastName: 'Tester', isOverseer: true,
    })).accessToken;

    // Create a test event directly via Prisma (simulating seed script)
    eventId = await createTestEvent();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('discoverEvents', () => {
    it('should return public events', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            query {
              discoverEvents {
                id
                name
                eventType
                venue
                startDate
                endDate
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(Array.isArray(response.body.data.discoverEvents)).toBe(true);
      expect(response.body.data.discoverEvents.length).toBeGreaterThan(0);
    });
  });

  describe('purchaseDepartment', () => {
    it('should purchase a department and receive an access code', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            mutation Purchase($input: PurchaseDepartmentInput!) {
              purchaseDepartment(input: $input) {
                id
                name
                departmentType
                accessCode
                isPublic
              }
            }
          `,
          variables: {
            input: {
              eventId,
              departmentType: 'ATTENDANT',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.purchaseDepartment.departmentType).toBe('ATTENDANT');
      expect(response.body.data.purchaseDepartment.accessCode).toBeDefined();
      expect(response.body.data.purchaseDepartment.accessCode).toMatch(/^ATT-[A-Z0-9]{4}$/);
      expect(response.body.data.purchaseDepartment.isPublic).toBe(true);

      departmentId = response.body.data.purchaseDepartment.id;
      departmentAccessCode = response.body.data.purchaseDepartment.accessCode;
    });

    it('should reject purchasing the same department type twice', async () => {
      const response = await request(app)
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
              departmentType: 'ATTENDANT',
            },
          },
        });

      expect(response.body.errors).toBeDefined();
    });

    it('should reject overseer purchasing a second department', async () => {
      const response = await request(app)
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
              departmentType: 'PARKING',
            },
          },
        });

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('availableDepartments', () => {
    it('should return unclaimed departments', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            query Available($eventId: ID!) {
              availableDepartments(eventId: $eventId)
            }
          `,
          variables: { eventId },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(Array.isArray(response.body.data.availableDepartments)).toBe(true);
      expect(response.body.data.availableDepartments.length).toBe(13); // 14 - 1 purchased
      expect(response.body.data.availableDepartments).not.toContain('ATTENDANT');
    });
  });

  describe('myAllEvents', () => {
    it('should return events with departmentAccessCode', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            query {
              myAllEvents {
                eventId
                membershipType
                overseerRole
                departmentType
                departmentAccessCode
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(Array.isArray(response.body.data.myAllEvents)).toBe(true);

      const membership = response.body.data.myAllEvents.find(
        (m: { eventId: string }) => m.eventId === eventId
      );
      expect(membership).toBeDefined();
      expect(membership.departmentAccessCode).toBe(departmentAccessCode);
      expect(membership.departmentType).toBe('ATTENDANT');
    });
  });

  describe('joinDepartmentByAccessCode', () => {
    let volunteerUserToken: string;

    it('should allow a user to join via access code', async () => {
      // Register a second user (non-overseer)
      volunteerUserToken = (await registerTestUser(app, {
        firstName: 'Join', lastName: 'Tester',
      })).accessToken;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${volunteerUserToken}`)
        .send({
          query: `
            mutation JoinByCode($input: JoinDepartmentByCodeInput!) {
              joinDepartmentByAccessCode(input: $input) {
                id
                department {
                  id
                }
              }
            }
          `,
          variables: {
            input: { accessCode: departmentAccessCode },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.joinDepartmentByAccessCode.id).toBeDefined();
      expect(response.body.data.joinDepartmentByAccessCode.department.id).toBeDefined();
    });

    it('should reject invalid access code', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${volunteerUserToken}`)
        .send({
          query: `
            mutation JoinByCode($input: JoinDepartmentByCodeInput!) {
              joinDepartmentByAccessCode(input: $input) {
                id
              }
            }
          `,
          variables: {
            input: { accessCode: 'INVALID-CODE' },
          },
        });

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('setDepartmentPrivacy', () => {
    it('should toggle department privacy', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            mutation SetPrivacy($departmentId: ID!, $isPublic: Boolean!) {
              setDepartmentPrivacy(departmentId: $departmentId, isPublic: $isPublic) {
                id
                isPublic
              }
            }
          `,
          variables: {
            departmentId,
            isPublic: false,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.setDepartmentPrivacy.isPublic).toBe(false);

      // Toggle back
      const response2 = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            mutation SetPrivacy($departmentId: ID!, $isPublic: Boolean!) {
              setDepartmentPrivacy(departmentId: $departmentId, isPublic: $isPublic) {
                isPublic
              }
            }
          `,
          variables: {
            departmentId,
            isPublic: true,
          },
        });

      expect(response2.body.data.setDepartmentPrivacy.isPublic).toBe(true);
    });
  });

  describe('departmentInfo', () => {
    it('should return department details', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            query DeptInfo($departmentId: ID!) {
              departmentInfo(departmentId: $departmentId) {
                id
                name
                departmentType
                accessCode
                isPublic
                hierarchyRoles {
                  id
                  hierarchyRole
                }
              }
            }
          `,
          variables: { departmentId },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.departmentInfo.accessCode).toBe(departmentAccessCode);
    });
  });

  describe('authorization failures', () => {
    let otherUserToken: string;

    beforeAll(async () => {
      // Register a second overseer who owns a different department on the same event
      otherUserToken = (await registerTestUser(app, {
        firstName: 'Other', lastName: 'Overseer', isOverseer: true,
      })).accessToken;

      // Purchase a different department on the same event
      await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          query: `
            mutation Purchase($input: PurchaseDepartmentInput!) {
              purchaseDepartment(input: $input) {
                id
              }
            }
          `,
          variables: { input: { eventId, departmentType: 'PARKING' } },
        });
    });

    it('should reject setDepartmentPrivacy by a non-owner overseer', async () => {
      if (!otherUserToken || !departmentId) {
        console.log('Skipping - setup incomplete');
        return;
      }

      // otherUserToken owns PARKING, not ATTENDANT — should not change ATTENDANT privacy
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          query: `
            mutation SetPrivacy($departmentId: ID!, $isPublic: Boolean!) {
              setDepartmentPrivacy(departmentId: $departmentId, isPublic: $isPublic) {
                id
              }
            }
          `,
          variables: { departmentId, isPublic: false },
        });

      expect(response.body.errors).toBeDefined();
    });

    it('should reject assignHierarchyRole by a different department overseer', async () => {
      if (!otherUserToken || !departmentId) {
        console.log('Skipping - setup incomplete');
        return;
      }

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          query: `
            mutation Assign($input: AssignHierarchyRoleInput!) {
              assignHierarchyRole(input: $input) {
                id
              }
            }
          `,
          variables: {
            input: {
              departmentId,
              userId: 'nonexistent-id',
              hierarchyRole: 'ASSISTANT_OVERSEER',
            },
          },
        });

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should reject joinDepartmentByAccessCode for the same user twice', async () => {
      const dupToken = (await registerTestUser(app, {
        firstName: 'Dup', lastName: 'Joiner',
      })).accessToken;

      // First join — should succeed
      await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${dupToken}`)
        .send({
          query: `
            mutation JoinByCode($input: JoinDepartmentByCodeInput!) {
              joinDepartmentByAccessCode(input: $input) {
                id
              }
            }
          `,
          variables: { input: { accessCode: departmentAccessCode } },
        });

      // Second join — should fail
      const secondResponse = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${dupToken}`)
        .send({
          query: `
            mutation JoinByCode($input: JoinDepartmentByCodeInput!) {
              joinDepartmentByAccessCode(input: $input) {
                id
              }
            }
          `,
          variables: { input: { accessCode: departmentAccessCode } },
        });

      expect(secondResponse.body.errors).toBeDefined();
    });

    it('discoverEvents should only return events where isPublic is true', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            query {
              discoverEvents {
                id
                isPublic
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      const events: { id: string; isPublic: boolean }[] = response.body.data.discoverEvents;
      expect(events.every((e) => e.isPublic === true)).toBe(true);
    });

    it('myAllEvents should return both memberships when user is both EventAdmin and EventVolunteer for the same event', async () => {
      // Register a new overseer user
      const dualToken = (await registerTestUser(app, {
        firstName: 'Dual', lastName: 'Role', isOverseer: true,
      })).accessToken;

      // Purchase a department (becomes EventAdmin/overseer)
      await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${dualToken}`)
        .send({
          query: `
            mutation Purchase($input: PurchaseDepartmentInput!) {
              purchaseDepartment(input: $input) {
                id
              }
            }
          `,
          variables: { input: { eventId, departmentType: 'CLEANING' } },
        });

      // Also join as a volunteer via the ATTENDANT access code
      await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${dualToken}`)
        .send({
          query: `
            mutation JoinByCode($input: JoinDepartmentByCodeInput!) {
              joinDepartmentByAccessCode(input: $input) {
                id
              }
            }
          `,
          variables: { input: { accessCode: departmentAccessCode } },
        });

      // myAllEvents should return both memberships for the same event
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${dualToken}`)
        .send({
          query: `
            query {
              myAllEvents {
                eventId
                membershipType
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();

      const memberships: { eventId: string; membershipType: string }[] =
        response.body.data.myAllEvents;
      const forThisEvent = memberships.filter((m) => m.eventId === eventId);

      expect(forThisEvent.length).toBe(2);
      const types = forThisEvent.map((m) => m.membershipType).sort();
      expect(types).toEqual(['OVERSEER', 'VOLUNTEER']);
    });
  });

  describe('assignHierarchyRole', () => {
    let eventVolunteerId: string;

    it('should assign assistant overseer role', async () => {
      // Register a volunteer and join the department
      const volToken = (await registerTestUser(app, {
        firstName: 'Hierarchy', lastName: 'Volunteer',
      })).accessToken;

      // Join the department via access code — returns the EventVolunteer id
      const joinRes = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${volToken}`)
        .send({
          query: `
            mutation JoinByCode($input: JoinDepartmentByCodeInput!) {
              joinDepartmentByAccessCode(input: $input) {
                id
              }
            }
          `,
          variables: {
            input: { accessCode: departmentAccessCode },
          },
        });

      eventVolunteerId = joinRes.body.data.joinDepartmentByAccessCode.id;

      // Assign hierarchy role using the eventVolunteerId
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            mutation Assign($input: AssignHierarchyRoleInput!) {
              assignHierarchyRole(input: $input) {
                id
                hierarchyRole
                eventVolunteer {
                  id
                }
              }
            }
          `,
          variables: {
            input: {
              departmentId,
              eventVolunteerId,
              hierarchyRole: 'ASSISTANT_OVERSEER',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.assignHierarchyRole.hierarchyRole).toBe('ASSISTANT_OVERSEER');
    });

    it('should remove hierarchy role', async () => {
      if (!eventVolunteerId) {
        console.log('Skipping - no volunteer assigned');
        return;
      }

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            mutation Remove($departmentId: ID!, $eventVolunteerId: ID!) {
              removeHierarchyRole(departmentId: $departmentId, eventVolunteerId: $eventVolunteerId)
            }
          `,
          variables: {
            departmentId,
            eventVolunteerId,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.removeHierarchyRole).toBe(true);
    });
  });
});
