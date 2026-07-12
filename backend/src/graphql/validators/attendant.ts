/**
 * Attendant Input Validators
 *
 * Zod schemas for validating attendant department inputs before processing.
 *
 * Schemas:
 *   - createLostPersonAlertSchema: Validate person name, age, contact info, location
 *   - createAttendantMeetingSchema: Validate session, date, attendee IDs (min 1)
 *   - updateAttendantMeetingSchema: Validate partial meeting updates (date, notes, attendees)
 *
 * Business Rules Enforced:
 *   - Description max 2000 chars
 *   - Location max 200 chars
 *   - Person name / contact name max 100 chars
 *   - Phone max 20 chars
 *   - At least one attendee required for meetings
 *
 * Used by: ../../services/attendantService.ts
 */
import { z } from 'zod';

export const createLostPersonAlertSchema = z.object({
  eventId: z.string().min(1),
  personName: z.string().min(1).max(100),
  age: z.number().int().positive().optional(),
  description: z.string().min(1).max(2000),
  lastSeenLocation: z.string().max(200).optional(),
  lastSeenTime: z.string().optional(),
  contactName: z.string().min(1).max(100),
  contactPhone: z.string().max(20).optional(),
  sessionId: z.string().min(1).optional(),
});

export const createAttendantMeetingSchema = z.object({
  eventId: z.string().min(1),
  sessionId: z.string().min(1),
  name: z.string().max(100).optional(),
  meetingDate: z.string().min(1),
  notes: z.string().max(2000).optional(),
  attendeeIds: z.array(z.string().min(1)).min(1),
});

export const updateAttendantMeetingSchema = z.object({
  id: z.string().min(1),
  name: z.string().max(100).optional().nullable(),
  meetingDate: z.string().min(1).optional(),
  notes: z.string().max(2000).optional().nullable(),
  attendeeIds: z.array(z.string().min(1)).min(1).optional(),
});

export type CreateLostPersonAlertInput = z.infer<typeof createLostPersonAlertSchema>;
export type CreateAttendantMeetingInput = z.infer<typeof createAttendantMeetingSchema>;
export type UpdateAttendantMeetingInput = z.infer<typeof updateAttendantMeetingSchema>;
