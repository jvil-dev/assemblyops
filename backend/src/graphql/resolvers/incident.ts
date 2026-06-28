/**
 * Incident Resolvers
 *
 * Department-agnostic safety-incident resolvers. Any department's volunteer can
 * report; incidents are scoped to the caller's department for listing, and
 * resolution requires department overseer / assistant-overseer access.
 *
 * Query Resolvers:
 *   - safetyIncidents(eventId, resolved?): The caller's department's incidents
 *
 * Mutation Resolvers:
 *   - reportSafetyIncident: Volunteer reports an incident (tagged with their department)
 *   - resolveSafetyIncident: Department overseer resolves an incident
 *
 * Used by: ./index.ts (resolver composition)
 */
import { Context } from '../context.js';
import { IncidentService } from '../../services/incidentService.js';
import { requireAuth, requireDeptAccess, resolveUserEventVolunteer } from '../guards/auth.js';
import { ReportSafetyIncidentInput } from '../validators/incident.js';
import { AuthorizationError } from '../../utils/errors.js';

/**
 * Helper: resolve the caller's department for an event.
 * Overseers resolve via their EventAdmin record; volunteers via EventVolunteer
 */
async function resolveCallerDepartmentId(context: Context, eventId: string): Promise<string> {
  const eventAdmin = await context.prisma.eventAdmin.findUnique({
    where: { userId_eventId: { userId: context.user!.id, eventId } },
    select: { departmentId: true },
  });
  if (eventAdmin?.departmentId) return eventAdmin.departmentId;

  const eventVolunteer = await context.prisma.eventVolunteer.findUnique({
    where: { userId_eventId: { userId: context.user!.id, eventId } },
    select: { departmentId: true },
  });
  if (eventVolunteer?.departmentId) return eventVolunteer.departmentId;

  throw new AuthorizationError('You are not assigned to a department for this event');
}

const incidentResolvers = {
  Query: {
    safetyIncidents: async (
      _parent: unknown,
      { eventId, resolved }: { eventId: string; resolved?: boolean },
      context: Context
    ) => {
      requireAuth(context);
      const departmentId = await resolveCallerDepartmentId(context, eventId);

      const incidentService = new IncidentService(context.prisma);
      return incidentService.getSafetyIncidents(eventId, departmentId, resolved);
    },
  },

  Mutation: {
    reportSafetyIncident: async (
      _parent: unknown,
      { input }: { input: ReportSafetyIncidentInput },
      context: Context
    ) => {
      requireAuth(context);

      const { id: eventVolunteerId, departmentId } = await resolveUserEventVolunteer(
        context.user!.id,
        input.eventId,
        context.prisma
      );
      if (!departmentId) {
        throw new AuthorizationError('You must belong to a department to report an incident');
      }

      const incidentService = new IncidentService(context.prisma);
      return incidentService.reportSafetyIncident(eventVolunteerId, departmentId, input);
    },

    resolveSafetyIncident: async (
      _parent: unknown,
      { id, resolutionNotes }: { id: string; resolutionNotes?: string },
      context: Context
    ) => {
      requireAuth(context);

      const incidentService = new IncidentService(context.prisma);
      const departmentId = await incidentService.getIncidentDepartmentId(id);
      await requireDeptAccess(context, departmentId);

      return incidentService.resolveSafetyIncident(id, context.user!.id, resolutionNotes);
    },
  },
};

export default incidentResolvers;
