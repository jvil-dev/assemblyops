/**
 * Incident Input Validators
 *
 * Zod schema for validating safety-incident reports before processing
 *
 * Schemas:
 *      - reportSafetyIncidentSchema: Validate incident type, description, location
 *
 * Used by: ../../services/incidentService.ts
 */
import { z } from 'zod';

export const reportSafetyIncidentSchema = z.object({
  eventId: z.string().min(1),
  type: z.enum([
    'BUILDING_DEFECT',
    'WET_FLOOR',
    'UNSAFE_CONDITION',
    'MEDICAL_EMERGENCY',
    'DISRUPTIVE_INDIVIDUAL',
    'BOMB_THREAT',
    'VIOLENT_INDIVIDUAL',
    'SEVERE_WEATHER',
    'ACTIVE_SHOOTER',
    'OTHER',
  ]),
  description: z.string().min(1).max(2000),
  location: z.string().max(200).nullish(),
  postId: z.string().min(1).nullish(),
  sessionId: z.string().min(1).nullish(),
});

export type ReportSafetyIncidentInput = z.infer<typeof reportSafetyIncidentSchema>;
