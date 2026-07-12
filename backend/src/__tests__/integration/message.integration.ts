/**
 * Message Integration Tests
 *
 * Tests for messaging operations between overseers and volunteers.
 *
 * Test suites:
 *   - sendMessage: Send message to individual volunteer
 *   - sendDepartmentMessage: Broadcast to department volunteers
 *   - sendBroadcast: Broadcast to all event volunteers
 *   - myMessages: Volunteer retrieves their messages
 *   - unreadMessageCount: Volunteer gets unread count
 *   - markMessageRead: Volunteer marks message as read
 *   - startConversation: Create DM thread
 *   - sendConversationMessage: Reply in thread
 *   - myConversations: List conversations for event
 *   - conversationMessages: Get messages in a thread
 *   - markConversationRead: Mark thread read
 *   - deleteConversation: Soft delete
 *   - sendMultiMessage: Send to multiple volunteers
 *   - searchMessages: Full-text search
 *   - deleteMessage: Soft delete
 *   - sentMessages: Overseer retrieves sent history
 *   - recipientName: Verify new field resolves correctly
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestApp, closeTestApp } from '../setup.js';
import { createTestEvent, createTestVolunteerUser, registerTestUser } from '../testHelpers.js';
import type { Application } from 'express';

describe('Message Operations', () => {
  let app: Application;
  let adminToken: string;
  let adminUserId: string;
  let volunteerToken: string;
  let eventId: string;
  let departmentId: string;
  let volunteerId: string;
  let volunteerId2: string;
  let messageId: string;
  let conversationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    // Register user (overseer)
    const reg = await registerTestUser(app, {
      firstName: 'Message', lastName: 'Tester', isOverseer: true,
    });
    adminToken = reg.accessToken;
    adminUserId = reg.userId;

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

    // Validate department purchase
    if (!purchaseRes.body?.data?.purchaseDepartment?.id) {
      throw new Error(
        `Department purchase failed: ${JSON.stringify(purchaseRes.body.errors || purchaseRes.body)}`
      );
    }
    departmentId = purchaseRes.body.data.purchaseDepartment.id;

    // Create volunteer user (registers User + creates EventVolunteer in department)
    const { accessToken: volToken, eventVolunteerId } = await createTestVolunteerUser(app, eventId, departmentId);
    volunteerToken = volToken;
    volunteerId = eventVolunteerId;

    // Create a second volunteer for multi-message tests
    const { eventVolunteerId: evId2 } = await createTestVolunteerUser(app, eventId, departmentId);
    volunteerId2 = evId2;
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('sendMessage', () => {
    it('should send message to volunteer', async () => {
      if (!volunteerId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation SendMessage($input: SendMessageInput!) {
              sendMessage(input: $input) {
                id
                subject
                body
                recipientType
                isRead
              }
            }
          `,
          variables: {
            input: {
              volunteerId,
              subject: 'Schedule Change',
              body: 'Your shift has been moved to 2pm.',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.sendMessage.subject).toBe('Schedule Change');
      expect(response.body.data.sendMessage.recipientType).toBe('VOLUNTEER');
      expect(response.body.data.sendMessage.isRead).toBe(false);

      messageId = response.body.data.sendMessage.id;
    });
  });

  describe('sendDepartmentMessage', () => {
    let deptConversationId: string;

    it('should create a broadcast conversation thread', async () => {
      if (!departmentId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation SendDeptMessage($input: SendDepartmentMessageInput!) {
              sendDepartmentMessage(input: $input) {
                id
                type
                subject
                departmentName
              }
            }
          `,
          variables: {
            input: {
              departmentId,
              subject: 'Department Update',
              body: 'Meeting at 8am tomorrow.',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      const conv = response.body.data.sendDepartmentMessage;
      expect(conv.id).toBeTruthy();
      expect(conv.type).toBe('DEPARTMENT_BROADCAST');
      deptConversationId = conv.id;
    });

    it('should reuse existing conversation for second department broadcast', async () => {
      if (!departmentId || !deptConversationId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation SendDeptMessage($input: SendDepartmentMessageInput!) {
              sendDepartmentMessage(input: $input) {
                id
                type
              }
            }
          `,
          variables: {
            input: {
              departmentId,
              subject: 'Another Update',
              body: 'Second department message.',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.sendDepartmentMessage.id).toBe(deptConversationId);
    });
  });

  describe('sendBroadcast', () => {
    let eventConversationId: string;

    it('should create a broadcast conversation thread', async () => {
      if (!eventId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation SendBroadcast($input: SendBroadcastInput!) {
              sendBroadcast(input: $input) {
                id
                type
                subject
              }
            }
          `,
          variables: {
            input: {
              eventId,
              subject: 'Event Announcement',
              body: 'Welcome to the assembly!',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      const conv = response.body.data.sendBroadcast;
      expect(conv.id).toBeTruthy();
      expect(conv.type).toBe('EVENT_BROADCAST');
      eventConversationId = conv.id;
    });

    it('should reuse existing conversation for second broadcast', async () => {
      if (!eventId || !eventConversationId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation SendBroadcast($input: SendBroadcastInput!) {
              sendBroadcast(input: $input) {
                id
                type
              }
            }
          `,
          variables: {
            input: {
              eventId,
              subject: 'Second Announcement',
              body: 'Remember to arrive early!',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.sendBroadcast.id).toBe(eventConversationId);
    });

    it('should show broadcast conversation in volunteer myConversations', async () => {
      if (!volunteerToken || !eventId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          query: `
            query {
              myConversations(eventId: "${eventId}") {
                id
                type
                subject
                unreadCount
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      const conversations = response.body.data.myConversations;
      const broadcastConv = conversations.find((c: Record<string, unknown>) => c.type === 'EVENT_BROADCAST');
      expect(broadcastConv).toBeDefined();
      expect(broadcastConv.unreadCount).toBeGreaterThan(0);
    });
  });

  describe('myMessages (volunteer)', () => {
    it('should return volunteer messages', async () => {
      if (!volunteerToken) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          query: `
            query {
              myMessages {
                id
                subject
                body
                isRead
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.myMessages.length).toBeGreaterThan(0);
    });
  });

  describe('unreadMessageCount', () => {
    it('should return unread count', async () => {
      if (!volunteerToken) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          query: `query { unreadMessageCount }`,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.unreadMessageCount).toBeGreaterThan(0);
    });
  });

  describe('markMessageRead', () => {
    it('should mark message as read', async () => {
      if (!volunteerToken || !messageId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          query: `
            mutation MarkRead($id: ID!) {
              markMessageRead(id: $id) {
                id
                isRead
                readAt
              }
            }
          `,
          variables: { id: messageId },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.markMessageRead.isRead).toBe(true);
      expect(response.body.data.markMessageRead.readAt).not.toBeNull();
    });
  });

  describe('startConversation', () => {
    it('should create a DM thread between two participants', async () => {
      if (!volunteerToken || !adminUserId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          query: `
            mutation StartConversation($input: StartConversationInput!) {
              startConversation(input: $input) {
                id
                subject
                participants {
                  id
                  participantType
                  displayName
                }
              }
            }
          `,
          variables: {
            input: {
              eventId,
              recipientType: 'USER',
              recipientId: adminUserId,
              subject: 'Question about my post',
              body: 'Hi, I wanted to ask about my assignment.',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      const convo = response.body.data.startConversation;
      expect(convo.subject).toBe('Question about my post');
      expect(convo.participants.length).toBe(2);

      conversationId = convo.id;
    });
  });

  describe('sendConversationMessage', () => {
    it('should reply in an existing thread', async () => {
      if (!adminToken || !conversationId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation SendConversationMessage($input: SendConversationMessageInput!) {
              sendConversationMessage(input: $input) {
                id
                body
                senderType
                senderName
              }
            }
          `,
          variables: {
            input: {
              conversationId,
              body: 'Sure, you are assigned to Post A at 10am.',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.sendConversationMessage.body).toBe(
        'Sure, you are assigned to Post A at 10am.'
      );
      expect(response.body.data.sendConversationMessage.senderType).toBe('USER');
      expect(response.body.data.sendConversationMessage.senderName).toBeTruthy();
    });
  });

  describe('myConversations', () => {
    it('should list conversations for event', async () => {
      if (!volunteerToken || !conversationId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          query: `
            query MyConversations($eventId: ID!) {
              myConversations(eventId: $eventId) {
                id
                subject
                lastMessage {
                  id
                  body
                }
                participants {
                  displayName
                }
                unreadCount
              }
            }
          `,
          variables: { eventId },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      const conversations = response.body.data.myConversations;
      expect(conversations.length).toBeGreaterThan(0);

      const convo = conversations.find(
        (c: { id: string }) => c.id === conversationId
      );
      expect(convo).toBeDefined();
      expect(convo.lastMessage).toBeTruthy();
      expect(convo.participants.length).toBe(2);
    });
  });

  describe('conversationMessages', () => {
    it('should get messages in a thread', async () => {
      if (!volunteerToken || !conversationId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          query: `
            query ConversationMessages($conversationId: ID!) {
              conversationMessages(conversationId: $conversationId) {
                id
                body
                senderType
                senderName
              }
            }
          `,
          variables: { conversationId },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      const messages = response.body.data.conversationMessages;
      expect(messages.length).toBe(2); // initial + reply
    });
  });

  describe('markConversationRead', () => {
    it('should mark thread read for participant', async () => {
      if (!volunteerToken || !conversationId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          query: `
            mutation MarkConversationRead($id: ID!) {
              markConversationRead(id: $id) {
                id
                participants {
                  participantType
                  lastReadAt
                }
              }
            }
          `,
          variables: { id: conversationId },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.markConversationRead.id).toBe(conversationId);
    });
  });

  describe('deleteConversation', () => {
    it('should soft delete conversation for participant', async () => {
      if (!volunteerToken || !conversationId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          query: `
            mutation DeleteConversation($id: ID!) {
              deleteConversation(id: $id)
            }
          `,
          variables: { id: conversationId },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.deleteConversation).toBe(true);

      // Verify it no longer shows in list for this user
      const listRes = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          query: `
            query MyConversations($eventId: ID!) {
              myConversations(eventId: $eventId) { id }
            }
          `,
          variables: { eventId },
        });

      const ids = listRes.body.data.myConversations.map((c: { id: string }) => c.id);
      expect(ids).not.toContain(conversationId);
    });
  });

  describe('sendMultiMessage', () => {
    it('should send to multiple volunteers at once', async () => {
      if (!volunteerId || !volunteerId2) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation SendMultiMessage($input: SendMultiMessageInput!) {
              sendMultiMessage(input: $input) {
                id
                subject
                body
                recipientType
              }
            }
          `,
          variables: {
            input: {
              volunteerIds: [volunteerId, volunteerId2],
              subject: 'Multi Update',
              body: 'This is a multi-recipient message.',
              eventId,
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.sendMultiMessage.length).toBe(2);
      expect(response.body.data.sendMultiMessage[0].recipientType).toBe('VOLUNTEER');
    });
  });

  describe('searchMessages', () => {
    it('should search messages by text', async () => {
      if (!adminToken) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            query SearchMessages($eventId: ID!, $query: String!) {
              searchMessages(eventId: $eventId, query: $query) {
                id
                subject
                body
              }
            }
          `,
          variables: { eventId, query: 'Multi Update' },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.searchMessages.length).toBeGreaterThan(0);
    });
  });

  describe('deleteMessage', () => {
    it('should soft delete a message', async () => {
      if (!volunteerToken || !messageId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          query: `
            mutation DeleteMessage($id: ID!) {
              deleteMessage(id: $id)
            }
          `,
          variables: { id: messageId },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.deleteMessage).toBe(true);
    });
  });

  describe('sentMessages', () => {
    it('should return sent messages for overseer', async () => {
      if (!adminToken) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            query {
              sentMessages {
                id
                subject
                body
                recipientType
                senderName
                recipientName
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.sentMessages.length).toBeGreaterThan(0);
    });
  });

  describe('recipientName', () => {
    it('should resolve recipientName for VOLUNTEER messages', async () => {
      if (!adminToken || !volunteerId) return;

      // Send a message and check recipientName resolves
      const sendRes = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation SendMessage($input: SendMessageInput!) {
              sendMessage(input: $input) {
                id
                recipientType
                recipientName
                senderName
              }
            }
          `,
          variables: {
            input: {
              volunteerId,
              subject: 'RecipientName Test',
              body: 'Testing recipientName field.',
            },
          },
        });

      expect(sendRes.status).toBe(200);
      expect(sendRes.body.errors).toBeUndefined();
      expect(sendRes.body.data.sendMessage.recipientName).toBeTruthy();
      expect(sendRes.body.data.sendMessage.senderName).toBeTruthy();
      // recipientName should be different from senderName
      expect(sendRes.body.data.sendMessage.recipientName).not.toBe(
        sendRes.body.data.sendMessage.senderName
      );
    });

    it('should resolve departmentName for DEPARTMENT broadcast conversation', async () => {
      if (!adminToken || !departmentId) return;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation SendDeptMessage($input: SendDepartmentMessageInput!) {
              sendDepartmentMessage(input: $input) {
                id
                type
                departmentName
              }
            }
          `,
          variables: {
            input: {
              departmentId,
              subject: 'Dept Name Test',
              body: 'Testing departmentName for dept.',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      const conv = response.body.data.sendDepartmentMessage;
      expect(conv.type).toBe('DEPARTMENT_BROADCAST');
      // departmentName should be the department name
      expect(conv.departmentName).toBeTruthy();
    });
  });
});
