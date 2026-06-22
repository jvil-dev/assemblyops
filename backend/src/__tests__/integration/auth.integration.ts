import request from 'supertest';
import { createTestApp, closeTestApp } from '../setup.js';
import { createTestCongregation } from '../testHelpers.js';
import type { Application } from 'express';

let app: Application;

describe('Auth', () => {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
  };

  let accessToken: string;
  let refreshToken: string;
  let congregationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    congregationId = await createTestCongregation();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('registerUser', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({
          query: `
            mutation RegisterUser($input: RegisterUserInput!) {
              registerUser(input: $input) {
                user {
                  id
                  email
                  firstName
                  lastName
                }
                accessToken
                refreshToken
                expiresIn
              }
            }
          `,
          variables: { input: { ...testUser, congregationId } },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.registerUser.user.email).toBe(testUser.email);
      expect(response.body.data.registerUser.accessToken).toBeDefined();
      expect(response.body.data.registerUser.refreshToken).toBeDefined();

      accessToken = response.body.data.registerUser.accessToken;
      refreshToken = response.body.data.registerUser.refreshToken;
    });

    it('should reject duplicate email', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({
          query: `
            mutation RegisterUser($input: RegisterUserInput!) {
              registerUser(input: $input) {
                user { id }
              }
            }
          `,
          variables: { input: { ...testUser, congregationId } },
        });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('already exists');
    });
  });

  describe('loginUser', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({
          query: `
            mutation LoginUser($input: LoginUserInput!) {
              loginUser(input: $input) {
                user {
                  email
                }
                accessToken
                refreshToken
              }
            }
          `,
          variables: {
            input: {
              email: testUser.email,
              password: testUser.password,
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.loginUser.user.email).toBe(testUser.email);

      // Update tokens - login deletes old tokens and creates new ones
      accessToken = response.body.data.loginUser.accessToken;
      refreshToken = response.body.data.loginUser.refreshToken;
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({
          query: `
            mutation LoginUser($input: LoginUserInput!) {
              loginUser(input: $input) {
                user { id }
              }
            }
          `,
          variables: {
            input: {
              email: testUser.email,
              password: 'WrongPassword123',
            },
          },
        });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Invalid');
    });
  });

  describe('me', () => {
    it('should return current user when authenticated', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            query Me {
              me {
                id
                email
                firstName
                lastName
                fullName
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.me.email).toBe(testUser.email);
      expect(response.body.data.me.fullName).toBe(`${testUser.firstName} ${testUser.lastName}`);
    });

    it('should return null when not authenticated', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({
          query: `
            query Me {
              me {
                id
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.me).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({
          query: `
            mutation RefreshToken($input: RefreshTokenInput!) {
              refreshToken(input: $input) {
                accessToken
                refreshToken
                expiresIn
              }
            }
          `,
          variables: { input: { refreshToken } },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.refreshToken.accessToken).toBeDefined();
      expect(response.body.data.refreshToken.refreshToken).toBeDefined();
    });
  });
});
