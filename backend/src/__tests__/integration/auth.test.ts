import request from 'supertest';
import { createTestApp, closeTestApp } from '../setup.js';
import { createTestEvent, createTestCongregation } from '../testHelpers.js';
import prisma from '../../config/database.js';
import type { Application } from 'express';

let app: Application;

const graphqlRequest = (query: string, variables?: object) =>
  request(app).post('/graphql').send({ query, variables }).set('Content-Type', 'application/json');

const authGraphqlRequest = (query: string, variables: object, token: string) =>
  request(app)
    .post('/graphql')
    .send({ query, variables })
    .set('Content-Type', 'application/json')
    .set('Authorization', `Bearer ${token}`);

describe('Auth GraphQL', () => {
  let userToken: string;
  let userEmail: string;
  let testEventId: string;
  let congregationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    userEmail = `test-${Date.now()}@test.com`;
    congregationId = await createTestCongregation();

    // Register user
    const registerRes = await graphqlRequest(
      `
        mutation RegisterUser($input: RegisterUserInput!) {
          registerUser(input: $input) {
            accessToken
            user { id }
          }
        }
      `,
      {
        input: {
          email: userEmail,
          password: 'Test123!',
          firstName: 'Test',
          lastName: 'User',
          isOverseer: true,
          congregationId,
        },
      }
    );

    if (registerRes.body.errors) {
      console.log('Register errors:', JSON.stringify(registerRes.body.errors, null, 2));
    }

    userToken = registerRes.body.data?.registerUser?.accessToken;

    if (!userToken) {
      console.log('No user token - registration failed');
      return;
    }

    // Create a test event directly via Prisma
    testEventId = await createTestEvent();

    // Purchase a department to gain event access (needed for volunteer creation)
    const purchaseRes = await authGraphqlRequest(
      `
        mutation Purchase($input: PurchaseDepartmentInput!) {
          purchaseDepartment(input: $input) {
            id
          }
        }
      `,
      { input: { eventId: testEventId, departmentType: 'ACCOUNTS' } },
      userToken
    );

    if (purchaseRes.body.errors) {
      console.log('Purchase failed:', JSON.stringify(purchaseRes.body.errors, null, 2));
    }
  });

  afterAll(async () => {
    // Cleanup in reverse order of dependencies
    if (testEventId) {
      await prisma.event.delete({ where: { id: testEventId } }).catch(() => {});
    }
    // Delete attendance counts submitted by test users (FK constraint)
    const testUsers = await prisma.user.findMany({
      where: { email: { contains: 'test-' } },
      select: { id: true },
    });
    if (testUsers.length > 0) {
      await prisma.attendanceCount.deleteMany({
        where: { submittedById: { in: testUsers.map((u) => u.id) } },
      });
    }
    await prisma.user.deleteMany({ where: { email: { contains: 'test-' } } });
    await prisma.congregation.deleteMany({ where: { name: { startsWith: 'Test Cong' } } });
    await closeTestApp();
    await prisma.$disconnect();
  });

  describe('User Auth', () => {
    it('should register a new user', async () => {
      const res = await graphqlRequest(
        `
          mutation RegisterUser($input: RegisterUserInput!) {
            registerUser(input: $input) {
              accessToken
              refreshToken
              expiresIn
              user { id email firstName }
            }
          }
        `,
        {
          input: {
            email: `another-${Date.now()}@test.com`,
            password: 'Test123!',
            firstName: 'Another',
            lastName: 'User',
            congregationId,
          },
        }
      );

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.registerUser.accessToken).toBeDefined();
      expect(res.body.data.registerUser.user.firstName).toBe('Another');
    });

    it('should login existing user', async () => {
      const res = await graphqlRequest(
        `
          mutation LoginUser($input: LoginUserInput!) {
            loginUser(input: $input) {
              accessToken
              refreshToken
              user { email }
            }
          }
        `,
        {
          input: {
            email: userEmail,
            password: 'Test123!',
          },
        }
      );

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.loginUser.accessToken).toBeDefined();
    });

    it('should reject invalid user credentials', async () => {
      const res = await graphqlRequest(
        `
          mutation LoginUser($input: LoginUserInput!) {
            loginUser(input: $input) {
              accessToken
            }
          }
        `,
        {
          input: {
            email: 'wrong@test.com',
            password: 'wrongpassword',
          },
        }
      );

      expect(res.body.errors).toBeDefined();
    });
  });

  // Github Issue Temp Fix
  describe.skip('Token Refresh', () => {
    it('should reject invalid refresh token', async () => {
      const res = await graphqlRequest(
        `
          mutation RefreshToken($input: RefreshTokenInput!) {
            refreshToken(input: $input) {
              accessToken
            }
          }
        `,
        {
          input: { refreshToken: 'invalid-token' },
        }
      );

      expect(res.body.errors).toBeDefined();
    });
  });
});
