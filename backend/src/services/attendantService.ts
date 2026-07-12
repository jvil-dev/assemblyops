/**
 * Attendant Service
 *
 * Business logic for attendant department features: safety incidents,
 * lost person alerts, and meetings.
 *
 * Methods:
 *   - createLostPersonAlert(reportedById, input): Report a lost person
 *   - resolveLostPersonAlert(id, adminId, resolutionNotes): Mark alert as resolved
 *   - getLostPersonAlerts(eventId, resolved?): Get lost person alerts for an event
 *   - createMeeting(createdById, input): Create an attendant meeting
 *   - updateMeeting(input): Update meeting date, notes, and/or attendees
 *   - updateMeetingNotes(id, notes): Update meeting notes
 *   - deleteMeeting(id): Remove a meeting
 *   - getMeetings(eventId): Get all meetings for an event
 *   - getMyMeetings(eventVolunteerId): Get meetings where volunteer is an attendee
 *   - getIncidentEventId(id): Get event ID for access control
 *   - getAlertEventId(id): Get event ID for access control
 *   - getMeetingEventId(id): Get event ID for access control
 *
 * Called by: ../graphql/resolvers/attendant.ts
 */
import { encryptField } from '../utils/encryption.js';
import { PrismaClient, LostPersonAlert, AttendantMeeting } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import {
  createLostPersonAlertSchema,
  createAttendantMeetingSchema,
  updateAttendantMeetingSchema,
  CreateLostPersonAlertInput,
  CreateAttendantMeetingInput,
  UpdateAttendantMeetingInput,
} from '../graphql/validators/attendant.js';

export class AttendantService {
  constructor(private prisma: PrismaClient) {}

  // MARK: - Lost Person Alerts

  /**
   * Create a lost person alert
   */
  async createLostPersonAlert(
    reportedById: string,
    input: CreateLostPersonAlertInput
  ): Promise<LostPersonAlert> {
    const result = createLostPersonAlertSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }

    const validated = result.data;
    return this.prisma.lostPersonAlert.create({
      data: {
        encryptedPersonName: encryptField(validated.personName),
        encryptedContactName: encryptField(validated.contactName),
        encryptedContactPhone: validated.contactPhone
          ? encryptField(validated.contactPhone)
          : undefined,
        age: validated.age,
        description: validated.description,
        lastSeenLocation: validated.lastSeenLocation,
        lastSeenTime: validated.lastSeenTime ? new Date(validated.lastSeenTime) : undefined,
        sessionId: validated.sessionId,
        eventId: validated.eventId,
        reportedById,
      },
      include: { reportedBy: true },
    });
  }

  /**
   * Resolve a lost person alert
   */
  async resolveLostPersonAlert(
    id: string,
    adminId: string,
    resolutionNotes: string
  ): Promise<LostPersonAlert> {
    const existing = await this.prisma.lostPersonAlert.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Lost person alert');
    }

    return this.prisma.lostPersonAlert.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedById: adminId,
        resolutionNotes,
      },
      include: { reportedBy: true, resolvedBy: true },
    });
  }

  /**
   * Get lost person alerts for an event
   */
  async getLostPersonAlerts(eventId: string, resolved?: boolean): Promise<LostPersonAlert[]> {
    return this.prisma.lostPersonAlert.findMany({
      where: { eventId, ...(resolved !== undefined ? { resolved } : {}) },
      include: { reportedBy: true, resolvedBy: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // MARK: - Attendant Meetings

  /**
   * Create an attendant meeting
   */
  async createMeeting(
    createdById: string,
    input: CreateAttendantMeetingInput
  ): Promise<AttendantMeeting> {
    const result = createAttendantMeetingSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }

    const { eventId, sessionId, name, meetingDate, notes, attendeeIds } = result.data;

    return this.prisma.attendantMeeting.create({
      data: {
        eventId,
        sessionId,
        name,
        meetingDate: new Date(meetingDate),
        notes,
        createdById,
        attendees: {
          create: attendeeIds.map((id) => ({ eventVolunteerId: id })),
        },
      },
      include: {
        session: true,
        createdBy: true,
        attendees: { include: { eventVolunteer: true } },
      },
    });
  }

  /**
   * Update a meeting (date, notes, and/or attendees)
   */
  async updateMeeting(input: UpdateAttendantMeetingInput): Promise<AttendantMeeting> {
    const result = updateAttendantMeetingSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }

    const { id, name, meetingDate, notes, attendeeIds } = result.data;

    const existing = await this.prisma.attendantMeeting.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Attendant meeting');
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) {
      data.name = name;
    }
    if (meetingDate !== undefined) {
      data.meetingDate = new Date(meetingDate);
    }
    if (notes !== undefined) {
      data.notes = notes;
    }

    if (attendeeIds) {
      // Replace attendees atomically
      return this.prisma.$transaction(async (tx) => {
        await tx.meetingAttendance.deleteMany({ where: { meetingId: id } });
        return tx.attendantMeeting.update({
          where: { id },
          data: {
            ...data,
            attendees: {
              create: attendeeIds.map((evId) => ({ eventVolunteerId: evId })),
            },
          },
          include: {
            session: true,
            createdBy: true,
            attendees: { include: { eventVolunteer: true } },
          },
        });
      });
    }

    return this.prisma.attendantMeeting.update({
      where: { id },
      data,
      include: {
        session: true,
        createdBy: true,
        attendees: { include: { eventVolunteer: true } },
      },
    });
  }

  /**
   * Update meeting notes
   */
  async updateMeetingNotes(id: string, notes: string): Promise<AttendantMeeting> {
    const existing = await this.prisma.attendantMeeting.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Attendant meeting');
    }

    return this.prisma.attendantMeeting.update({
      where: { id },
      data: { notes },
      include: {
        session: true,
        createdBy: true,
        attendees: { include: { eventVolunteer: true } },
      },
    });
  }

  /**
   * Delete a meeting
   */
  async deleteMeeting(id: string): Promise<boolean> {
    const existing = await this.prisma.attendantMeeting.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Attendant meeting');
    }

    await this.prisma.attendantMeeting.delete({ where: { id } });
    return true;
  }

  /**
   * Get all meetings for an event
   */
  async getMeetings(eventId: string): Promise<AttendantMeeting[]> {
    return this.prisma.attendantMeeting.findMany({
      where: { eventId },
      include: {
        session: true,
        createdBy: true,
        attendees: { include: { eventVolunteer: true } },
      },
      orderBy: { meetingDate: 'desc' },
    });
  }

  /**
   * Get meetings where a volunteer is an attendee
   */
  async getMyMeetings(eventVolunteerId: string): Promise<AttendantMeeting[]> {
    return this.prisma.attendantMeeting.findMany({
      where: {
        attendees: {
          some: { eventVolunteerId },
        },
      },
      include: {
        session: true,
        createdBy: true,
        attendees: { include: { eventVolunteer: true } },
      },
      orderBy: { meetingDate: 'desc' },
    });
  }

  // MARK: - Access Control Helpers

  /**
   * Get alert's event ID for access control
   */
  async getAlertEventId(id: string): Promise<string> {
    const alert = await this.prisma.lostPersonAlert.findUnique({
      where: { id },
      select: { eventId: true },
    });

    if (!alert) {
      throw new NotFoundError('Lost person alert');
    }

    return alert.eventId;
  }

  /**
   * Get meeting's event ID for access control
   */
  async getMeetingEventId(id: string): Promise<string> {
    const meeting = await this.prisma.attendantMeeting.findUnique({
      where: { id },
      select: { eventId: true },
    });

    if (!meeting) {
      throw new NotFoundError('Attendant meeting');
    }

    return meeting.eventId;
  }
}
