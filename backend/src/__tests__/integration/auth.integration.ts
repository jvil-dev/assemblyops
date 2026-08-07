/**
 * Auth Integration Tests
 *
 * Exercises the auth mutations end to end through the GraphQL endpoint against
 * the local test Postgres.
 *
 * Coverage:
 *   - registerUser, loginUser, me, refreshToken
 *   - multi-device sessions: independent rotation, reuse detection, logoutAllSessions
 */
import request from 'supertest';
import { createTestApp, closeTestApp } from '../setup.js';
import { createTestCongregation, registerTestUser } from '../testHelpers.js';
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

  describe('multi-device sessions', () => {
    const REFRESH_MUTATION = `
      mutation RefreshToken($input: RefreshTokenInput!) {
        refreshToken(input: $input) {
          accessToken
          refreshToken
        }
      }
    `;

    const LOGIN_MUTATION = `
      mutation LoginUser($input: LoginUserInput!) {
        loginUser(input: $input) {
          accessToken
          refreshToken
        }
      }
    `;

    const password = 'MultiDevice123!';
    let email: string;

    /** Sign in as the shared user, standing in for one more device. */
    const signIn = async () => {
      const res = await request(app)
        .post('/graphql')
        .send({ query: LOGIN_MUTATION, variables: { input: { email, password } } });
      expect(res.body.errors).toBeUndefined();
      return res.body.data.loginUser as { accessToken: string; refreshToken: string };
    };

    const refresh = (token: string) =>
      request(app)
        .post('/graphql')
        .send({ query: REFRESH_MUTATION, variables: { input: { refreshToken: token } } });

    // Device A's original token, kept past its rotation so it can be replayed
    let spentTokenA: string;
    let currentTokenB: string;

    beforeAll(async () => {
      const registered = await registerTestUser(app, { password });
      email = registered.email;
    });

    it('leaves the other device signed in when one device rotates', async () => {
      const deviceA = await signIn();
      const deviceB = await signIn();
      spentTokenA = deviceA.refreshToken;
      currentTokenB = deviceB.refreshToken;

      const rotatedA = await refresh(spentTokenA);
      expect(rotatedA.body.errors).toBeUndefined();
      expect(rotatedA.body.data.refreshToken.refreshToken).toBeDefined();

      // Device B was untouched by A's rotation
      const rotatedB = await refresh(currentTokenB);
      expect(rotatedB.body.errors).toBeUndefined();
      currentTokenB = rotatedB.body.data.refreshToken.refreshToken;
    });

    it('rejects a spent token and revokes every session (reuse detection)', async () => {
      const replayed = await refresh(spentTokenA);
      expect(replayed.body.errors).toBeDefined();
      expect(replayed.body.errors[0].message).toContain('Invalid or expired refresh token');

      // A replayed token is the stolen-token signal, so every live session dies with it
      const afterReuse = await refresh(currentTokenB);
      expect(afterReuse.body.errors).toBeDefined();
    });

    it('keeps other devices signed in after one device logs out', async () => {
      const deviceA = await signIn();
      const deviceB = await signIn();

      const loggedOut = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${deviceA.accessToken}`)
        .send({
          query: `mutation Logout($token: String!) { logoutUser(refreshToken: $token) { success } }`,
          variables: { token: deviceA.refreshToken },
        });
      expect(loggedOut.body.errors).toBeUndefined();

      // Retrying A's dead token is a stale client, not theft — B must survive it
      const retried = await refresh(deviceA.refreshToken);
      expect(retried.body.errors).toBeDefined();

      const stillLive = await refresh(deviceB.refreshToken);
      expect(stillLive.body.errors).toBeUndefined();
    });

    it('invalidates every session on logoutAllSessions', async () => {
      const deviceA = await signIn();
      const deviceB = await signIn();

      const loggedOut = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${deviceA.accessToken}`)
        .send({ query: `mutation { logoutAllSessions { success } }` });
      expect(loggedOut.body.errors).toBeUndefined();
      expect(loggedOut.body.data.logoutAllSessions.success).toBe(true);

      for (const device of [deviceA, deviceB]) {
        const res = await refresh(device.refreshToken);
        expect(res.body.errors).toBeDefined();
      }
    });
  });
});
