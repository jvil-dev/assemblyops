/**
 * GraphQL Schema Composition
 *
 * This file combines all the GraphQL type definitions into a single schema.
 * Think of it as the "table of contents" for your API.
 *
 * Schema files define WHAT your API can do:
 *   - types.ts: Core types (Event, Volunteer, Department, Post, Session, etc.)
 *   - auth.ts: Authentication queries/mutations (login, register, logout)
 *   - event.ts: Event management (activate, join, claim department)
 *   - volunteer.ts: Volunteer management (create, update, delete, login)
 *
 * The baseTypeDefs here defines:
 *   - DateTime scalar: Custom type for timestamps
 *   - Query root: Starting point for all queries
 *   - Mutation root: Starting point for all mutations
 *   - health: Basic health check query
 *
 * Used by: ./index.ts (Apollo Server setup)
 * Implemented by: ../resolvers/ (the actual logic)
 */
import types from './types.js';
import authTypeDefs from './auth.js';
import eventTypeDefs from './event.js';
import volunteerTypeDefs from './volunteer.js';
import postTypeDefs from './post.js';
import sessionTypeDefs from './session.js';
import assignmentTypeDefs from './assignment.js';
import checkInTypeDefs from './checkIn.js';
import messageTypeDefs from './message.js';
import eventNoteTypeDefs from './eventNotes.js';
import attendanceTypeDefs from './attendance.js';
import { oauthTypeDefs } from './oauth.js';
import { circuitTypeDefs } from './circuit.js';
import { congregationTypeDefs } from './congregation.js';
import { volunteerProfileTypeDefs } from './volunteerProfile.js';
import { attendantTypeDefs } from './attendant.js';
import { incidentTypeDefs } from './incident.js';
import { areaTypeDefs } from './area.js';
import { walkThroughTypeDefs } from './walkThrough.js';
import { postSessionStatusTypeDefs } from './postSessionStatus.js';
import { floorPlanTypeDefs } from './floorPlan.js';
import adminTypeDefs from './admin.js';
import gcpTypeDefs from './gcp.js';
import { audioVideoTypeDefs } from './audioVideo.js';
import { shiftTypeDefs } from './shift.js';
import { captainSchedulingTypeDefs } from './captainScheduling.js';
import { reminderTypeDefs } from './reminder.js';
import { lanyardTypeDefs } from './lanyard.js';
import notificationTypeDefs from './notification.js';

const baseTypeDefs = `#graphql
  scalar DateTime

  type Query {
    health: HealthStatus!
  }

  type Mutation {
    _empty: String
  }

  type Subscription {
    _empty: String
  }

  type HealthStatus {
    status: String!
    timestamp: DateTime!
    database: String!
  }
`;

const typeDefs = [
  baseTypeDefs,
  types,
  authTypeDefs,
  eventTypeDefs,
  volunteerTypeDefs,
  postTypeDefs,
  sessionTypeDefs,
  assignmentTypeDefs,
  checkInTypeDefs,
  messageTypeDefs,
  eventNoteTypeDefs,
  attendanceTypeDefs,
  oauthTypeDefs,
  circuitTypeDefs,
  congregationTypeDefs,
  volunteerProfileTypeDefs,
  attendantTypeDefs,
  incidentTypeDefs,
  areaTypeDefs,
  walkThroughTypeDefs,
  postSessionStatusTypeDefs,
  floorPlanTypeDefs,
  adminTypeDefs,
  gcpTypeDefs,
  audioVideoTypeDefs,
  shiftTypeDefs,
  captainSchedulingTypeDefs,
  reminderTypeDefs,
  lanyardTypeDefs,
  notificationTypeDefs,
];

export default typeDefs;
