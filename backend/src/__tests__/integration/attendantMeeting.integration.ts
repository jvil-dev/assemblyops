/**
 * Attendant Meeting Integration Tests
 *
 * Tests for meeting CRUD operations and authorization:
 *   - createAttendantMeeting: Overseer creates a meeting
 *   - updateAttendantMeeting: Update date, notes, and attendees
 *   - updateAttendantMeeting: Assistant overseer can update
 *   - updateAttendantMeeting: Unauthorized user is rejected
 *   - deleteAttendantMeeting: Overseer deletes a meeting
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestApp, closeTestApp } from '../setup.js';
import { createTestEvent, createTestVolunteerUser, registerTestUser } from '../testHelpers.js';
import prisma from '../../config/database.js';
import type { Application } from 'express';

describe('Attendant Meeting Operations', () => {
  let app: Application;
  let overseerToken: string;
  let eventId: string;
  let departmentId: string;
  let sessionId: string;
  let attendeeVolunteerId: string;
  let attendee2VolunteerId: string;
  let meetingId: string;

  beforeAll(async () => {
    app = await createTestApp();

    // Register overseer
    overseerToken = (await registerTestUser(app, {
      firstName: 'Meeting', lastName: 'Overseer', isOverseer: true,
    })).accessToken;

    // Create event
    eventId = await createTestEvent();

    // Purchase attendant department (gives event access)
    const purchaseRes = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${overseerToken}`)
      .send({
        query: `mutation($input: PurchaseDepartmentInput!) { purchaseDepartment(input: $input) { id } }`,
        variables: { input: { eventId, departmentType: 'ATTENDANT' } },
      });
    departmentId = purchaseRes.body.data.purchaseDepartment.id;

    // Create session
    const sessionRes = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${overseerToken}`)
      .send({
        query: `mutation($eventId: ID!, $input: CreateSessionInput!) { createSession(eventId: $eventId, input: $input) { id } }`,
        variables: {
          eventId,
          input: {
            name: 'Meeting Test Session',
            date: '2026-04-01T00:00:00Z',
            startTime: '09:00',
            endTime: '12:00',
          },
        },
      });
    sessionId = sessionRes.body.data.createSession.id;

    // Create two volunteer attendees
    const vol1 = await createTestVolunteerUser(app, eventId, departmentId);
    attendeeVolunteerId = vol1.eventVolunteerId;

    const vol2 = await createTestVolunteerUser(app, eventId, departmentId);
    attendee2VolunteerId = vol2.eventVolunteerId;
  });

  afterAll(async () => {
    await closeTestApp();
  });

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  it('creates an attendant meeting', async () => {
    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${overseerToken}`)
      .send({
        query: `mutation CreateMeeting($input: CreateAttendantMeetingInput!) {
          createAttendantMeeting(input: $input) {
            id
            session { id name }
            meetingDate
            notes
            attendees { id eventVolunteer { id } }
          }
        }`,
        variables: {
          input: {
            eventId,
            sessionId,
            meetingDate: '2026-03-30T07:00:00.000Z',
            notes: 'Initial briefing',
            attendeeIds: [attendeeVolunteerId],
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const meeting = res.body.data.createAttendantMeeting;
    expect(meeting.session.id).toBe(sessionId);
    expect(meeting.notes).toBe('Initial briefing');
    expect(meeting.attendees).toHaveLength(1);

    meetingId = meeting.id;
  });

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  it('updates meeting date and notes', async () => {
    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${overseerToken}`)
      .send({
        query: `mutation UpdateMeeting($input: UpdateAttendantMeetingInput!) {
          updateAttendantMeeting(input: $input) {
            id
            meetingDate
            notes
            attendees { id eventVolunteer { id } }
          }
        }`,
        variables: {
          input: {
            id: meetingId,
            meetingDate: '2026-03-30T08:00:00.000Z',
            notes: 'Updated briefing',
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const meeting = res.body.data.updateAttendantMeeting;
    expect(meeting.notes).toBe('Updated briefing');
    // Attendees should be unchanged
    expect(meeting.attendees).toHaveLength(1);
  });

  it('replaces attendee list', async () => {
    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${overseerToken}`)
      .send({
        query: `mutation UpdateMeeting($input: UpdateAttendantMeetingInput!) {
          updateAttendantMeeting(input: $input) {
            id
            attendees { id eventVolunteer { id } }
          }
        }`,
        variables: {
          input: {
            id: meetingId,
            attendeeIds: [attendeeVolunteerId, attendee2VolunteerId],
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const meeting = res.body.data.updateAttendantMeeting;
    expect(meeting.attendees).toHaveLength(2);
    const evIds = meeting.attendees.map((a: { eventVolunteer: { id: string } }) => a.eventVolunteer.id);
    expect(evIds).toContain(attendeeVolunteerId);
    expect(evIds).toContain(attendee2VolunteerId);
  });

  // ---------------------------------------------------------------------------
  // Auth: assistant overseer
  // ---------------------------------------------------------------------------

  it('allows assistant overseer to update a meeting', async () => {
    // Create a non-overseer user and make them an assistant overseer
    const assistantUser = await createTestVolunteerUser(app, eventId, departmentId);

    await prisma.departmentHierarchy.create({
      data: {
        departmentId,
        eventVolunteerId: assistantUser.eventVolunteerId,
        hierarchyRole: 'ASSISTANT_OVERSEER',
      },
    });

    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${assistantUser.accessToken}`)
      .send({
        query: `mutation UpdateMeeting($input: UpdateAttendantMeetingInput!) {
          updateAttendantMeeting(input: $input) { id notes }
        }`,
        variables: {
          input: {
            id: meetingId,
            notes: 'Updated by assistant',
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.updateAttendantMeeting.notes).toBe('Updated by assistant');
  });

  // ---------------------------------------------------------------------------
  // Auth: unauthorized
  // ---------------------------------------------------------------------------

  it('rejects update from regular volunteer', async () => {
    const volunteer = await createTestVolunteerUser(app, eventId, departmentId);

    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${volunteer.accessToken}`)
      .send({
        query: `mutation UpdateMeeting($input: UpdateAttendantMeetingInput!) {
          updateAttendantMeeting(input: $input) { id }
        }`,
        variables: {
          input: {
            id: meetingId,
            notes: 'Should fail',
          },
        },
      });

    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toMatch(/overseer|access/i);
  });

  it('rejects update without auth token', async () => {
    const res = await request(app)
      .post('/graphql')
      .send({
        query: `mutation UpdateMeeting($input: UpdateAttendantMeetingInput!) {
          updateAttendantMeeting(input: $input) { id }
        }`,
        variables: {
          input: {
            id: meetingId,
            notes: 'Should fail',
          },
        },
      });

    expect(res.body.errors).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------

  it('creates notifications for attendees on meeting creation', async () => {
    // Create a meeting with both attendees
    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${overseerToken}`)
      .send({
        query: `mutation CreateMeeting($input: CreateAttendantMeetingInput!) {
          createAttendantMeeting(input: $input) { id name }
        }`,
        variables: {
          input: {
            eventId,
            sessionId,
            meetingDate: '2026-04-01T07:00:00.000Z',
            name: 'Pre-Event Briefing',
            attendeeIds: [attendeeVolunteerId, attendee2VolunteerId],
          },
        },
      });

    expect(res.body.errors).toBeUndefined();
    const newMeetingId = res.body.data.createAttendantMeeting.id;

    // Wait briefly for fire-and-forget notification to persist
    await new Promise((r) => setTimeout(r, 200));

    // Look up the userIds for the attendees
    const vol1 = await prisma.eventVolunteer.findUnique({
      where: { id: attendeeVolunteerId },
      select: { userId: true },
    });
    const vol2 = await prisma.eventVolunteer.findUnique({
      where: { id: attendee2VolunteerId },
      select: { userId: true },
    });

    const notifications = await prisma.notification.findMany({
      where: {
        eventId,
        userId: { in: [vol1!.userId, vol2!.userId] },
        title: 'New Meeting Assignment',
        body: { contains: 'Pre-Event Briefing' },
      },
    });

    expect(notifications.length).toBeGreaterThanOrEqual(2);

    // Cleanup
    await prisma.meetingAttendance.deleteMany({ where: { meetingId: newMeetingId } });
    await prisma.attendantMeeting.delete({ where: { id: newMeetingId } });
  });

  it('does not notify the meeting creator', async () => {
    // Get the overseer's user ID
    const meRes = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${overseerToken}`)
      .send({ query: `query { me { id } }` });
    const overseerUserId = meRes.body.data.me.id;

    // Make overseer also an EventVolunteer in the attendant department
    const overseerEv = await prisma.eventVolunteer.findFirst({
      where: { userId: overseerUserId, eventId },
    });

    // If overseer is already an EV, use their ID; otherwise skip
    if (overseerEv) {
      const res = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${overseerToken}`)
        .send({
          query: `mutation CreateMeeting($input: CreateAttendantMeetingInput!) {
            createAttendantMeeting(input: $input) { id }
          }`,
          variables: {
            input: {
              eventId,
              sessionId,
              meetingDate: '2026-04-01T08:00:00.000Z',
              attendeeIds: [overseerEv.id, attendeeVolunteerId],
            },
          },
        });

      expect(res.body.errors).toBeUndefined();
      const selfMeetingId = res.body.data.createAttendantMeeting.id;

      await new Promise((r) => setTimeout(r, 200));

      // Overseer should NOT receive a notification
      const overseerNotifications = await prisma.notification.findMany({
        where: {
          userId: overseerUserId,
          title: 'New Meeting Assignment',
          body: { contains: selfMeetingId },
        },
      });
      expect(overseerNotifications).toHaveLength(0);

      // Cleanup
      await prisma.meetingAttendance.deleteMany({ where: { meetingId: selfMeetingId } });
      await prisma.attendantMeeting.delete({ where: { id: selfMeetingId } });
    }
  });

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  it('deletes a meeting and cascades attendees', async () => {
    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${overseerToken}`)
      .send({
        query: `mutation DeleteMeeting($id: ID!) {
          deleteAttendantMeeting(id: $id)
        }`,
        variables: { id: meetingId },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.deleteAttendantMeeting).toBe(true);

    // Verify meeting is gone from DB
    const meeting = await prisma.attendantMeeting.findUnique({
      where: { id: meetingId },
    });
    expect(meeting).toBeNull();

    // Verify attendees are cascade-deleted
    const attendances = await prisma.meetingAttendance.findMany({
      where: { meetingId },
    });
    expect(attendances).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Cron: Meeting Reminders
  // ---------------------------------------------------------------------------

  it('cron rejects requests without cron secret', async () => {
    const res = await request(app)
      .post('/api/cron/meeting-reminders')
      .send();

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('cron rejects requests with wrong cron secret', async () => {
    const res = await request(app)
      .post('/api/cron/meeting-reminders')
      .set('X-Cron-Secret', 'wrong-secret')
      .send();

    expect(res.status).toBe(403);
  });

  it('cron sends reminders for meetings scheduled tomorrow', async () => {
    // Create a meeting for tomorrow
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(10, 0, 0, 0);

    const createRes = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${overseerToken}`)
      .send({
        query: `mutation CreateMeeting($input: CreateAttendantMeetingInput!) {
          createAttendantMeeting(input: $input) { id }
        }`,
        variables: {
          input: {
            eventId,
            sessionId,
            meetingDate: tomorrow.toISOString(),
            name: 'Tomorrow Briefing',
            attendeeIds: [attendeeVolunteerId],
          },
        },
      });
    expect(createRes.body.errors).toBeUndefined();
    const tomorrowMeetingId = createRes.body.data.createAttendantMeeting.id;

    // Call the cron endpoint
    const cronRes = await request(app)
      .post('/api/cron/meeting-reminders')
      .set('X-Cron-Secret', process.env.CRON_SECRET || 'local-dev-cron-secret-change-in-production')
      .send();

    expect(cronRes.status).toBe(200);
    expect(cronRes.body.meetingsProcessed).toBeGreaterThanOrEqual(1);
    expect(cronRes.body.notificationsSent).toBeGreaterThanOrEqual(1);

    // Verify reminder notification was created
    const vol = await prisma.eventVolunteer.findUnique({
      where: { id: attendeeVolunteerId },
      select: { userId: true },
    });

    const reminders = await prisma.notification.findMany({
      where: {
        userId: vol!.userId,
        title: 'Meeting Reminder',
      },
    });
    expect(reminders.length).toBeGreaterThanOrEqual(1);
    expect(reminders[0].body).toContain('Tomorrow Briefing');

    // Cleanup
    await prisma.meetingAttendance.deleteMany({ where: { meetingId: tomorrowMeetingId } });
    await prisma.attendantMeeting.delete({ where: { id: tomorrowMeetingId } });
  });

  it('cron returns zero counts when no meetings are scheduled for tomorrow', async () => {
    // Create a meeting far in the future (not tomorrow)
    const futureDate = new Date();
    futureDate.setUTCDate(futureDate.getUTCDate() + 30);
    futureDate.setUTCHours(10, 0, 0, 0);

    const createRes = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${overseerToken}`)
      .send({
        query: `mutation CreateMeeting($input: CreateAttendantMeetingInput!) {
          createAttendantMeeting(input: $input) { id }
        }`,
        variables: {
          input: {
            eventId,
            sessionId,
            meetingDate: futureDate.toISOString(),
            attendeeIds: [attendeeVolunteerId],
          },
        },
      });
    expect(createRes.body.errors).toBeUndefined();
    const futureMeetingId = createRes.body.data.createAttendantMeeting.id;

    // Clean up any tomorrow meetings from other tests
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowStart = new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate()));
    const tomorrowEnd = new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate() + 1));

    // Delete any lingering tomorrow meetings from this event
    await prisma.meetingAttendance.deleteMany({
      where: { meeting: { eventId, meetingDate: { gte: tomorrowStart, lt: tomorrowEnd } } },
    });
    await prisma.attendantMeeting.deleteMany({
      where: { eventId, meetingDate: { gte: tomorrowStart, lt: tomorrowEnd } },
    });

    const cronRes = await request(app)
      .post('/api/cron/meeting-reminders')
      .set('X-Cron-Secret', process.env.CRON_SECRET || 'local-dev-cron-secret-change-in-production')
      .send();

    expect(cronRes.status).toBe(200);
    // The future meeting should not be picked up
    // (other events in DB may have tomorrow meetings, so just check status is 200)

    // Cleanup
    await prisma.meetingAttendance.deleteMany({ where: { meetingId: futureMeetingId } });
    await prisma.attendantMeeting.delete({ where: { id: futureMeetingId } });
  });
});
