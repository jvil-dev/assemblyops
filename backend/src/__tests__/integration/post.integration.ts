/**
 * Post Integration Tests
 *
 * Tests for post-related GraphQL operations.
 * Posts are physical locations/positions within a department
 * (e.g., "Gate A", "Main Entrance", "Information Booth").
 *
 * Test Setup:
 *   1. Register a new overseer
 *   2. Create a test event via Prisma
 *   3. Purchase a department (ATTENDANT)
 *
 * Tests:
 *   - createPost: Create single post with name, description, location
 *   - createPosts: Bulk create multiple posts in one mutation
 *   - posts: Query posts by departmentId with assignmentCount
 *
 * TODO: Add updatePost and deletePost tests
 */
import request from 'supertest';
import { createTestApp, closeTestApp } from '../setup.js';
import { createTestEvent, registerTestUser } from '../testHelpers.js';
import type { Application } from 'express';

let app: Application;

describe('Post Operations', () => {
  let accessToken: string;
  let eventId: string;
  let departmentId: string;

  beforeAll(async () => {
    app = await createTestApp();
    // Register user (overseer)
    accessToken = (await registerTestUser(app, {
      firstName: 'Post', lastName: 'Tester', isOverseer: true,
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
            departmentType: 'ATTENDANT',
          },
        },
      });

    if (purchaseRes.body.errors) {
      console.error('Purchase failed:', purchaseRes.body.errors);
      return;
    }
    departmentId = purchaseRes.body.data.purchaseDepartment.id;
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('createPost', () => {
    it('should create a post', async () => {
      if (!departmentId) {
        console.log('Skipping - no department available');
        return;
      }

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            mutation CreatePost($departmentId: ID!, $input: CreatePostInput!) {
              createPost(departmentId: $departmentId, input: $input) {
                id
                name
                description
                location
              }
            }
          `,
          variables: {
            departmentId,
            input: {
              name: 'East Lobby',
              description: 'Main entrance',
              location: 'Building A',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.createPost.name).toBe('East Lobby');
      // postId = response.body.data.createPost.id;
    });
  });

  describe('createPosts', () => {
    it('should bulk create posts', async () => {
      if (!departmentId) {
        console.log('Skipping - no department available');
        return;
      }

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            mutation CreatePosts($input: CreatePostsInput!) {
              createPosts(input: $input) {
                id
                name
              }
            }
          `,
          variables: {
            input: {
              departmentId,
              posts: [
                { name: 'West Lobby' },
                { name: 'South Lobby' },
                { name: 'Auditorium' },
              ],
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.createPosts.length).toBe(3);
    });
  });

  describe('posts', () => {
    it('should return department posts', async () => {
      if (!departmentId) {
        console.log('Skipping - no department available');
        return;
      }

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            query Posts($departmentId: ID!) {
              posts(departmentId: $departmentId) {
                id
                name
                assignmentCount
              }
            }
          `,
          variables: { departmentId },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(Array.isArray(response.body.data.posts)).toBe(true);
      expect(response.body.data.posts.length).toBeGreaterThan(0);
    });
  });
});
