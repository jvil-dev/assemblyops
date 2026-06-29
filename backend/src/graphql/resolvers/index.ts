/**
 * GraphQL Resolver Composition
 *
 * This file combines all resolvers into a single object for Apollo Server.
 * Resolvers are the functions that actually execute when a query/mutation is called.
 *
 * Structure:
 *   - Query: All read operations (me, events, volunteers, etc.)
 *   - Mutation: All write operations (register, login, create, update, delete)
 *   - Type Resolvers: Computed fields on types (User.fullName, Event.volunteerCount)
 *
 * Flow:
 *   1. Client sends a GraphQL query/mutation
 *   2. Apollo matches it to the schema (../schema/)
 *   3. The matching resolver function here gets called
 *   4. Resolver calls guards (authorization), validators (input), and services (business logic)
 *   5. Result is returned to the client
 *
 * Type resolvers (User, Event, Volunteer, etc.):
 *   These resolve fields that aren't directly stored in the database.
 *   Example: User.fullName computes firstName + lastName
 *   Example: Event.volunteerCount counts related volunteers
 *
 * Used by: ../index.ts (Apollo Server setup)
 */
import { DateTimeResolver } from 'graphql-scalars';
import { Context } from '../context.js';
import authResolvers from './auth.js';
import eventResolvers from './event.js';
import volunteerResolvers from './volunteer.js';
import postResolvers from './post.js';
import sessionResolvers from './session.js';
import assignmentResolvers from './assignment.js';
import checkInResolvers from './checkIn.js';
import messageResolvers from './message.js';
import eventNoteResolvers from './eventNote.js';
import attendanceResolvers from './attendance.js';
import { oauthResolvers } from './oauth.js';
import circuitResolvers from './circuit.js';
import congregationResolvers from './congregation.js';
import volunteerProfileResolvers from './volunteerProfile.js';
import attendantResolvers from './attendant.js';
import incidentResolvers from './incident.js';
import areaResolvers from './area.js';
import walkThroughResolvers from './walkThrough.js';
import postSessionStatusResolvers from './postSessionStatus.js';
import floorPlanResolvers from './floorPlan.js';
import adminResolvers from './admin.js';
import gcpResolvers from './gcp.js';
import audioVideoResolvers from './audioVideo.js';
import shiftResolvers from './shift.js';
import captainSchedulingResolvers from './captainScheduling.js';
import reminderResolvers from './reminder.js';
import lanyardResolvers from './lanyard.js';
import notificationResolvers from './notification.js';

const baseResolvers = {
  DateTime: DateTimeResolver,

  Query: {
    health: async (_parent: unknown, _args: unknown, { prisma }: Context) => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return {
          status: 'healthy',
          timestamp: new Date(),
          database: 'connected',
        };
      } catch {
        return {
          status: 'unhealthy',
          timestamp: new Date(),
          database: 'disconnected',
        };
      }
    },
  },

  Mutation: {
    _empty: (): null => null,
  },
};

const resolvers = {
  DateTime: baseResolvers.DateTime,

  Query: {
    ...baseResolvers.Query,
    ...authResolvers.Query,
    ...eventResolvers.Query,
    ...volunteerResolvers.Query,
    ...postResolvers.Query,
    ...sessionResolvers.Query,
    ...assignmentResolvers.Query,
    ...checkInResolvers.Query,
    ...messageResolvers.Query,
    ...eventNoteResolvers.Query,
    ...attendanceResolvers.Query,
    ...circuitResolvers.Query,
    ...congregationResolvers.Query,
    ...volunteerProfileResolvers.Query,
    ...attendantResolvers.Query,
    ...incidentResolvers.Query,
    ...areaResolvers.Query,
    ...walkThroughResolvers.Query,
    ...postSessionStatusResolvers.Query,
    ...floorPlanResolvers.Query,
    ...adminResolvers.Query,
    ...gcpResolvers.Query,
    ...audioVideoResolvers.Query,
    ...shiftResolvers.Query,
    ...captainSchedulingResolvers.Query,
    ...reminderResolvers.Query,
    ...lanyardResolvers.Query,
    ...notificationResolvers.Query,
  },

  Mutation: {
    ...baseResolvers.Mutation,
    ...authResolvers.Mutation,
    ...eventResolvers.Mutation,
    ...volunteerResolvers.Mutation,
    ...postResolvers.Mutation,
    ...sessionResolvers.Mutation,
    ...assignmentResolvers.Mutation,
    ...checkInResolvers.Mutation,
    ...messageResolvers.Mutation,
    ...eventNoteResolvers.Mutation,
    ...attendanceResolvers.Mutation,
    ...oauthResolvers.Mutation,
    ...volunteerProfileResolvers.Mutation,
    ...attendantResolvers.Mutation,
    ...incidentResolvers.Mutation,
    ...areaResolvers.Mutation,
    ...walkThroughResolvers.Mutation,
    ...postSessionStatusResolvers.Mutation,
    ...floorPlanResolvers.Mutation,
    ...adminResolvers.Mutation,
    ...audioVideoResolvers.Mutation,
    ...shiftResolvers.Mutation,
    ...captainSchedulingResolvers.Mutation,
    ...reminderResolvers.Mutation,
    ...lanyardResolvers.Mutation,
    ...notificationResolvers.Mutation,
  },

  Subscription: {
    ...messageResolvers.Subscription,
  },

  User: authResolvers.User,
  Event: eventResolvers.Event,
  Department: eventResolvers.Department,
  Post: postResolvers.Post,
  Session: sessionResolvers.Session,
  ScheduleAssignment: assignmentResolvers.ScheduleAssignment,
  AttendanceCount: attendanceResolvers.AttendanceCount,
  Circuit: circuitResolvers.Circuit,
  Congregation: congregationResolvers.Congregation,
  VolunteerProfile: volunteerProfileResolvers.VolunteerProfile,
  EventVolunteer: volunteerProfileResolvers.EventVolunteer,
  Volunteer: volunteerResolvers.Volunteer,
  Area: areaResolvers.Area,
  AreaCaptainAssignment: areaResolvers.AreaCaptainAssignment,
  Message: messageResolvers.Message,
  Conversation: messageResolvers.Conversation,
  ConversationParticipant: messageResolvers.ConversationParticipant,
  AVEquipmentItem: audioVideoResolvers.AVEquipmentItem,
  AVEquipmentCheckout: audioVideoResolvers.AVEquipmentCheckout,
  AVDamageReport: audioVideoResolvers.AVDamageReport,
  AVHazardAssessment: audioVideoResolvers.AVHazardAssessment,
  AVSafetyBriefing: audioVideoResolvers.AVSafetyBriefing,
  Shift: shiftResolvers.Shift,
};

export default resolvers;
