/**
 * Attendant GraphQL Schema
 *
 * Type definitions for attendant department operational features:
 * safety incidents, lost person alerts, and pre-event meetings.
 *
 * Types:
 *   - LostPersonAlert: Missing person report with contact info
 *   - AttendantMeeting: Pre-event briefing with attendee list
 *   - MeetingAttendance: Join record linking volunteer to meeting
 *
 * Queries:
 *   - lostPersonAlerts(eventId, resolved?): Filter alerts by event/status
 *   - attendantMeetings(eventId): All meetings for an event
 *   - myAttendantMeetings(eventId): Volunteer's assigned meetings
 *
 * Mutations:
 *   - createLostPersonAlert / resolveLostPersonAlert
 *   - createAttendantMeeting / updateAttendantMeetingNotes / deleteAttendantMeeting
 *
 * Used by: ../resolvers/attendant.ts
 */
export const attendantTypeDefs = `#graphql
  type LostPersonAlert {
    id: ID!
    personName: String!
    age: Int
    description: String!
    lastSeenLocation: String
    lastSeenTime: String
    contactName: String!
    contactPhone: String
    reportedBy: EventVolunteer!
    event: Event!
    resolved: Boolean!
    resolvedAt: String
    resolvedBy: User
    resolutionNotes: String
    createdAt: String!
  }

  type AttendantMeeting {
    id: ID!
    name: String
    session: Session!
    event: Event!
    meetingDate: DateTime!
    notes: String
    createdBy: User!
    attendees: [MeetingAttendance!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type MeetingAttendance {
    id: ID!
    meeting: AttendantMeeting!
    eventVolunteer: EventVolunteer!
    createdAt: DateTime!
  }

  input CreateLostPersonAlertInput {
    eventId: ID!
    personName: String!
    age: Int
    description: String!
    lastSeenLocation: String
    lastSeenTime: String
    contactName: String!
    contactPhone: String
    sessionId: ID
  }

  input CreateAttendantMeetingInput {
    eventId: ID!
    sessionId: ID!
    name: String
    meetingDate: String!
    notes: String
    attendeeIds: [ID!]!
  }

  input UpdateAttendantMeetingInput {
    id: ID!
    name: String
    meetingDate: String
    notes: String
    attendeeIds: [ID!]
  }

  extend type Query {
    lostPersonAlerts(eventId: ID!, resolved: Boolean): [LostPersonAlert!]!
    attendantMeetings(eventId: ID!): [AttendantMeeting!]!
    myAttendantMeetings(eventId: ID!): [AttendantMeeting!]!
  }

  extend type Mutation {
    createLostPersonAlert(input: CreateLostPersonAlertInput!): LostPersonAlert!
    resolveLostPersonAlert(id: ID!, resolutionNotes: String!): LostPersonAlert!
    createAttendantMeeting(input: CreateAttendantMeetingInput!): AttendantMeeting!
    updateAttendantMeeting(input: UpdateAttendantMeetingInput!): AttendantMeeting!
    updateAttendantMeetingNotes(id: ID!, notes: String!): AttendantMeeting!
    deleteAttendantMeeting(id: ID!): Boolean!
  }
`;
