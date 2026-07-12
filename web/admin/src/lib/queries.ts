/**
 * GraphQL Queries & Mutations
 *
 * All GraphQL operations used by the admin portal.
 *
 * Mutations:
 *   - LOGIN_USER: Authenticate with email/password
 *   - IMPORT_CONGREGATIONS: Bulk CSV import of congregations
 *   - IMPORT_EVENTS: Bulk CSV import of events
 *   - IMPORT_VOLUNTEERS: Bulk CSV import of volunteers for an event
 *
 * Queries:
 *   - APP_ANALYTICS: Platform-wide user/event/assignment counts
 *   - USER_GROWTH: User registration over time by period
 *   - EVENT_STATS: Per-event volunteer/department/session counts
 *   - CLOUD_RUN_SERVICE_STATUS: Cloud Run service health and revision info
 *   - GCP_METRICS: Time-series CPU/memory utilization
 *   - GCP_LOGS: Recent log events with optional filter
 *   - GCP_COST_BREAKDOWN: Per-service cost for a date range
 *   - DATABASE_STATS: DB size, connections, table row counts
 *   - ADMIN_LIST_USERS: Paginated user list with search
 *   - ADMIN_LIST_EVENTS: Paginated event list
 *
 * Used by: All pages and the useAuth hook
 */
import { gql } from '@apollo/client/core';

export const LOGIN_USER = gql`
  mutation LoginUser($input: LoginUserInput!) {
    loginUser(input: $input) {
      user { id email firstName lastName isAppAdmin }
      accessToken
      refreshToken
      expiresIn
    }
  }
`;

export const APP_ANALYTICS = gql`
  query AppAnalytics {
    appAnalytics {
      totalUsers
      totalOverseers
      totalEvents
      totalVolunteers
      totalAssignments
      totalCheckIns
    }
  }
`;

export const USER_GROWTH = gql`
  query UserGrowth($period: String!) {
    userGrowth(period: $period) {
      date
      count
    }
  }
`;

export const EVENT_STATS = gql`
  query EventStats {
    eventStats {
      eventId
      name
      eventType
      startDate
      volunteerCount
      departmentCount
      sessionCount
    }
  }
`;

export const CLOUD_RUN_SERVICE_STATUS = gql`
  query CloudRunServiceStatus {
    cloudRunServiceStatus {
      status
      latestRevision
      cpuLimit
      memoryLimit
      minInstances
      maxInstances
    }
  }
`;

export const GCP_METRICS = gql`
  query GcpMetrics($period: String!, $metricName: String!) {
    gcpMetrics(period: $period, metricName: $metricName) {
      timestamp
      value
    }
  }
`;

export const GCP_LOGS = gql`
  query GcpLogs($limit: Int, $filter: String) {
    gcpLogs(limit: $limit, filter: $filter) {
      timestamp
      message
      logStreamName
    }
  }
`;

export const GCP_COST_BREAKDOWN = gql`
  query GcpCostBreakdown($startDate: String!, $endDate: String!) {
    gcpCostBreakdown(startDate: $startDate, endDate: $endDate) {
      service
      amount
      unit
      timePeriodStart
      timePeriodEnd
    }
  }
`;

export const DATABASE_STATS = gql`
  query DatabaseStats {
    databaseStats {
      databaseSize
      activeConnections
      tableCounts {
        users
        events
        eventVolunteers
        assignments
        checkIns
      }
    }
  }
`;

export const ADMIN_LIST_USERS = gql`
  query AdminListUsers($limit: Int, $offset: Int, $search: String) {
    adminListUsers(limit: $limit, offset: $offset, search: $search) {
      users {
        id
        userId
        email
        firstName
        lastName
        isOverseer
        isAppAdmin
        createdAt
        eventCount
      }
      totalCount
    }
  }
`;

export const ADMIN_LIST_EVENTS = gql`
  query AdminListEvents($limit: Int, $offset: Int) {
    adminListEvents(limit: $limit, offset: $offset) {
      events {
        eventId
        name
        eventType
        startDate
        endDate
        venue
        state
        volunteerCount
        departmentCount
        sessionCount
        overseerCount
      }
      totalCount
    }
  }
`;

export const IMPORT_CONGREGATIONS = gql`
  mutation ImportCongregations($csvData: String!) {
    importCongregations(csvData: $csvData) {
      success
      created
      updated
      skipped
      totalRows
      errors { row field message }
    }
  }
`;

export const IMPORT_EVENTS = gql`
  mutation ImportEvents($csvData: String!) {
    importEvents(csvData: $csvData) {
      success
      created
      updated
      skipped
      totalRows
      errors { row field message }
    }
  }
`;

export const IMPORT_VOLUNTEERS = gql`
  mutation ImportVolunteers($eventId: ID!, $csvData: String!) {
    importVolunteers(eventId: $eventId, csvData: $csvData) {
      success
      created
      updated
      skipped
      totalRows
      errors { row field message }
    }
  }
`;
