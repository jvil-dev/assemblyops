/**
 * Incident GraphQL Schema
 *
 * Department-agnostic safety-incident types and operations.
 *
 * Enums:
 *   - SafetyIncidentType: 10 incident categories (building defect, wet floor, etc.)
 *
 * Types:
 *   - SafetyIncident: Incident report with resolution tracking
 *
 * Queries:
 *   - safetyIncidents(eventId, resolved?): A department's incidents by event/status
 *
 * Mutations:
 *   - reportSafetyIncident / resolveSafetyIncident
 *
 * Used by: ../resolvers/incident.ts
 */
export const incidentTypeDefs = `#graphql
    enum SafetyIncidentType {
      BUILDING_DEFECT
      WET_FLOOR
      UNSAFE_CONDITION
      MEDICAL_EMERGENCY
      DISRUPTIVE_INDIVIDUAL
      BOMB_THREAT
      VIOLENT_INDIVIDUAL
      SEVERE_WEATHER
      ACTIVE_SHOOTER
      OTHER
    }
    type SafetyIncident {
      id: ID!
      type: SafetyIncidentType!
      description: String!
      location: String
      post: Post
      reportedBy: EventVolunteer!
      event: Event!
      resolved: Boolean!
      resolvedAt: String
      resolvedBy: User
      resolutionNotes: String
      createdAt: String!
    }

    input ReportSafetyIncidentInput {
      eventId: ID!
      type: SafetyIncidentType!
      description: String!
      location: String
      postId: ID
      sessionId: ID
    }

    extend type Query {
      safetyIncidents(eventId: ID!, resolved: Boolean): [SafetyIncident!]!
    }

    extend type Mutation {
      reportSafetyIncident(input: ReportSafetyIncidentInput!): SafetyIncident!
      resolveSafetyIncident(id: ID!, resolutionNotes: String): SafetyIncident!
    }
`;
