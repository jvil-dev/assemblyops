/**
 * IncidentService Unit Tests
 *
 * Tests the department-aware incident logic: validation, department tagging,
 * resolution, per-department filtering, and not-found errors.
 * Prisma is mocked via createPrismaMock() so no database is required.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createPrismaMock } from '../unitTestHelpers.js';
import { IncidentService } from '../../services/incidentService.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import type { ReportSafetyIncidentInput } from '../../graphql/validators/incident.js';

function makeInput(overrides: Partial<ReportSafetyIncidentInput> = {}): ReportSafetyIncidentInput {
  return {
    eventId: 'event-1',
    type: 'WET_FLOOR',
    description: 'Spilled water near entrance',
    ...overrides,
  };
}

describe('IncidentService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: IncidentService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createPrismaMock();
    service = new IncidentService(prisma);
  });

  describe('reportSafetyIncident', () => {
    it('throws ValidationError when description is empty', async () => {
      await expect(
        service.reportSafetyIncident('ev-1', 'dept-1', makeInput({ description: '' }))
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when type is invalid', async () => {
      await expect(
        service.reportSafetyIncident('ev-1', 'dept-1', makeInput({ type: 'NOT_A_TYPE' as never }))
      ).rejects.toThrow(ValidationError);
    });

    it('tags the incident with the reporter and department', async () => {
      vi.mocked(prisma.safetyIncident.create).mockResolvedValue({ id: 'inc-1' } as never);

      await service.reportSafetyIncident('ev-1', 'dept-1', makeInput());

      expect(prisma.safetyIncident.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventId: 'event-1',
            type: 'WET_FLOOR',
            reportedById: 'ev-1',
            departmentId: 'dept-1',
          }),
        })
      );
    });
  });

  describe('resolveSafetyIncident', () => {
    it('throws NotFoundError when the incident does not exist', async () => {
      vi.mocked(prisma.safetyIncident.findUnique).mockResolvedValue(null);

      await expect(service.resolveSafetyIncident('nonexistent', 'admin-1')).rejects.toThrow(
        NotFoundError
      );
    });

    it('marks the incident resolved with resolver and notes', async () => {
      vi.mocked(prisma.safetyIncident.findUnique).mockResolvedValue({ id: 'inc-1' } as never);
      vi.mocked(prisma.safetyIncident.update).mockResolvedValue({ id: 'inc-1' } as never);

      await service.resolveSafetyIncident('inc-1', 'admin-1', 'Mopped up');

      expect(prisma.safetyIncident.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inc-1' },
          data: expect.objectContaining({
            resolved: true,
            resolvedById: 'admin-1',
            resolutionNotes: 'Mopped up',
          }),
        })
      );
    });
  });

  describe('getSafetyIncidents', () => {
    it('filters by event and department when resolved is omitted', async () => {
      vi.mocked(prisma.safetyIncident.findMany).mockResolvedValue([] as never);

      await service.getSafetyIncidents('event-1', 'dept-1');

      expect(prisma.safetyIncident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: 'event-1', departmentId: 'dept-1' },
        })
      );
    });

    it('adds the resolved filter when provided', async () => {
      vi.mocked(prisma.safetyIncident.findMany).mockResolvedValue([] as never);

      await service.getSafetyIncidents('event-1', 'dept-1', true);

      expect(prisma.safetyIncident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: 'event-1', departmentId: 'dept-1', resolved: true },
        })
      );
    });
  });

  describe('getIncidentDepartmentId', () => {
    it('returns the department ID for an existing incident', async () => {
      vi.mocked(prisma.safetyIncident.findUnique).mockResolvedValue({
        departmentId: 'dept-1',
      } as never);

      const departmentId = await service.getIncidentDepartmentId('inc-1');
      expect(departmentId).toBe('dept-1');
    });

    it('throws NotFoundError when the incident does not exist', async () => {
      vi.mocked(prisma.safetyIncident.findUnique).mockResolvedValue(null);

      await expect(service.getIncidentDepartmentId('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });
});
