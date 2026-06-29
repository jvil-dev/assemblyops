/**
 * Incident Service
 *
 * Business logic for department-agnostic safety incidents: report, resolve, list
 * Each incident is tagged with the reporting volunteer's department for per-department scoping
 *
 * Methods:
 *   - reportSafetyIncident(reportedById, departmentId, input): Report an incident
 *   - resolveSafetyIncident(id, adminId, resolutionNotes?): Mark incident as resolved
 *   - getSafetyIncidents(eventId, departmentId, resolved?): List a department's incidents
 *   - getIncidentDepartmentId(id): Get the incident's department for access control
 *
 * Called by: ../graphql/resolvers/incident.ts
 */
import { PrismaClient, SafetyIncident } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import {
  reportSafetyIncidentSchema,
  ReportSafetyIncidentInput,
} from '../graphql/validators/incident.js';

export class IncidentService {
  constructor(private prisma: PrismaClient) {}

  // Report a safety incident, tagged with the reporter's department
  async reportSafetyIncident(
    reportedById: string,
    departmentId: string,
    input: ReportSafetyIncidentInput
  ): Promise<SafetyIncident> {
    const result = reportSafetyIncidentSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }

    const { postId, sessionId, eventId } = result.data;

    // Post is scoped to a department - reject cross-department references
    if (postId) {
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        select: { departmentId: true },
      });
      if (!post || post.departmentId !== departmentId) {
        throw new ValidationError('Post does not belong to your department');
      }
    }

    // Session is scoped to an event - reject cross-event references
    if (sessionId) {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        select: { eventId: true },
      });
      if (!session || session.eventId !== eventId) {
        throw new ValidationError('Session does not belong to this event');
      }
    }

    return this.prisma.safetyIncident.create({
      data: {
        ...result.data,
        reportedById,
        departmentId,
      },
      include: { post: true, reportedBy: true },
    });
  }

  // Resolve a safety incident
  async resolveSafetyIncident(
    id: string,
    adminId: string,
    resolutionNotes?: string
  ): Promise<SafetyIncident> {
    const existing = await this.prisma.safetyIncident.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Safety incident');
    }

    return this.prisma.safetyIncident.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedById: adminId,
        resolutionNotes,
      },
      include: { post: true, reportedBy: true, resolvedBy: true },
    });
  }

  // Get a department's safety incidents for an event
  async getSafetyIncidents(
    eventId: string,
    departmentId: string,
    resolved?: boolean
  ): Promise<SafetyIncident[]> {
    return this.prisma.safetyIncident.findMany({
      where: {
        eventId,
        departmentId,
        ...(resolved !== undefined ? { resolved } : {}),
      },
      include: { post: true, reportedBy: true, resolvedBy: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get an incident's department ID for access control
  async getIncidentDepartmentId(id: string): Promise<string> {
    const incident = await this.prisma.safetyIncident.findUnique({
      where: { id },
      select: { departmentId: true },
    });

    if (!incident) {
      throw new NotFoundError('Safety incident');
    }

    return incident.departmentId;
  }
}
