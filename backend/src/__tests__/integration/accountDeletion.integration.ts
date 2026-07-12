/**
 * Account Deletion & Department Removal Integration Tests
 *
 * Tests the full GraphQL flow for:
 *   - deleteAccount: password-based and unauthenticated scenarios
 *   - updateVolunteer with departmentId: null: department removal with cascading cleanup
 *
 * Setup:
 *   1. Register overseer user + create test event + purchase department
 *   2. Create posts, sessions, and volunteers for cleanup verification
 */
import request from 'supertest';
import { createTestApp, closeTestApp } from '../setup.js';
import { createTestEvent, registerTestUser } from '../testHelpers.js';
import prisma from '../../config/database.js';
import type { Application } from 'express';

let app: Application;

describe('Account Deletion & Department Removal', () => {
  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  // =========================================================================
  // deleteAccount
  // =========================================================================

  describe('deleteAccount mutation', () => {
    it('should delete a password-based user account with correct password', async () => {
      const password = 'TestPassword123!';
      const { accessToken, userId } = await registerTestUser(app, {
        password, firstName: 'Delete', lastName: 'Me',
      });

      const deleteRes = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            mutation DeleteAccount($password: String) {
              deleteAccount(password: $password)
            }
          `,
          variables: { password },
        });

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.errors).toBeUndefined();
      expect(deleteRes.body.data.deleteAccount).toBe(true);

      const deletedUser = await prisma.user.findUnique({
        where: { id: userId },
      });
      expect(deletedUser).toBeNull();
    });

    it('should reject deletion with wrong password', async () => {
      const { accessToken } = await registerTestUser(app, {
        firstName: 'Wrong', lastName: 'PW',
      });

      const deleteRes = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            mutation DeleteAccount($password: String) {
              deleteAccount(password: $password)
            }
          `,
          variables: { password: 'WrongPassword999!' },
        });

      expect(deleteRes.body.errors).toBeDefined();
      expect(deleteRes.body.errors[0].message).toContain('Incorrect password');
    });

    it('should reject deletion without password for password-based user', async () => {
      const { accessToken } = await registerTestUser(app, {
        firstName: 'No', lastName: 'PW',
      });

      const deleteRes = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            mutation DeleteAccount($password: String) {
              deleteAccount(password: $password)
            }
          `,
          variables: { password: null },
        });

      expect(deleteRes.body.errors).toBeDefined();
      expect(deleteRes.body.errors[0].message).toContain('Password is required');
    });

    it('should reject deletion for unauthenticated requests', async () => {
      const deleteRes = await request(app)
        .post('/graphql')
        .send({
          query: `
            mutation DeleteAccount($password: String) {
              deleteAccount(password: $password)
            }
          `,
          variables: { password: 'anything' },
        });

      expect(deleteRes.body.errors).toBeDefined();
    });

    it('should cascade-delete related EventVolunteer records', async () => {
      const password = 'TestPassword123!';
      const { accessToken, userId } = await registerTestUser(app, {
        password, firstName: 'Cascade', lastName: 'Test',
      });

      const eventId = await createTestEvent();
      const ev = await prisma.eventVolunteer.create({
        data: { userId, eventId },
      });

      const deleteRes = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            mutation DeleteAccount($password: String) {
              deleteAccount(password: $password)
            }
          `,
          variables: { password },
        });

      expect(deleteRes.body.data.deleteAccount).toBe(true);

      const orphanedEv = await prisma.eventVolunteer.findUnique({
        where: { id: ev.id },
      });
      expect(orphanedEv).toBeNull();
    });
  });

  // =========================================================================
  // Department removal with cascading cleanup
  // =========================================================================

  describe('department removal with cleanup', () => {
    let overseerToken: string;
    let eventId: string;
    let departmentId: string;

    beforeAll(async () => {
      overseerToken = (await registerTestUser(app, {
        firstName: 'Dept', lastName: 'Remover', isOverseer: true,
      })).accessToken;
      eventId = await createTestEvent();

      const purchaseRes = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${overseerToken}`)
        .send({
          query: `
            mutation Purchase($input: PurchaseDepartmentInput!) {
              purchaseDepartment(input: $input) {
                id
              }
            }
          `,
          variables: {
            input: { eventId, departmentType: 'ATTENDANT' },
          },
        });

      departmentId = purchaseRes.body.data.purchaseDepartment.id;
    });

    it('should remove volunteer from department and clean up assignments', async () => {
      if (!departmentId || !eventId) {
        console.log('Skipping - setup incomplete');
        return;
      }

      // Create a volunteer in this department
      const createVolRes = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${overseerToken}`)
        .send({
          query: `
            mutation Create($eventId: ID!, $input: CreateVolunteerInput!) {
              createVolunteer(eventId: $eventId, input: $input) {
                id
              }
            }
          `,
          variables: {
            eventId,
            input: {
              firstName: 'Cleanup',
              lastName: 'Test',
              congregation: `Cleanup Cong ${Date.now()}`,
              departmentId,
            },
          },
        });

      const volunteerId = createVolRes.body.data.createVolunteer.id;
      expect(volunteerId).toBeDefined();

      // Create post, session, shift, and assignment via Prisma
      const post = await prisma.post.create({
        data: { name: `Test Post ${Date.now()}`, departmentId },
      });

      const session = await prisma.session.create({
        data: {
          eventId,
          name: `Test Session ${Date.now()}`,
          date: new Date(),
          startTime: new Date('1970-01-01T08:00:00.000Z'),
          endTime: new Date('1970-01-01T12:00:00.000Z'),
        },
      });

      const shift = await prisma.shift.create({
        data: {
          sessionId: session.id,
          postId: post.id,
          name: 'Test Shift',
          startTime: new Date('1970-01-01T08:00:00.000Z'),
          endTime: new Date('1970-01-01T10:00:00.000Z'),
        },
      });

      const assignment = await prisma.scheduleAssignment.create({
        data: {
          eventVolunteerId: volunteerId,
          postId: post.id,
          sessionId: session.id,
          shiftId: shift.id,
        },
      });

      // Remove volunteer from department
      const updateRes = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${overseerToken}`)
        .send({
          query: `
            mutation UpdateVol($id: ID!, $input: UpdateVolunteerInput!) {
              updateVolunteer(id: $id, input: $input) {
                id
                department {
                  id
                }
              }
            }
          `,
          variables: {
            id: volunteerId,
            input: { departmentId: null },
          },
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.errors).toBeUndefined();
      expect(updateRes.body.data.updateVolunteer.department).toBeNull();

      // Verify assignment was cleaned up
      const orphanedAssignment = await prisma.scheduleAssignment.findUnique({
        where: { id: assignment.id },
      });
      expect(orphanedAssignment).toBeNull();
    });
  });
});
