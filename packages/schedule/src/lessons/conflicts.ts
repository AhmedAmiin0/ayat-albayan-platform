import { z } from 'zod';

// Booking conflicts (R-SCH-04, issue B3). Arabic messages: ar.json `booking.conflict.<kind>`.

export const CONFLICT_KINDS = [
  'teacher_busy',
  'student_busy',
  'outside_availability',
  'time_off',
] as const;
export const conflictKindSchema = z.enum(CONFLICT_KINDS);
export type ConflictKind = z.infer<typeof conflictKindSchema>;

/** One clash for one proposed occurrence. Instants are ISO-8601 UTC. */
export const conflictSchema = z.object({
  kind: conflictKindSchema,
  startsAt: z.string(),
  endsAt: z.string(),
  /** The lesson already in that slot (teacher_busy / student_busy). */
  lessonId: z.string().optional(),
  /** The student who is busy (student_busy). */
  studentId: z.string().optional(),
});
export type Conflict = z.infer<typeof conflictSchema>;

/** 409 body of POST /booking and POST /lessons/:id/reschedule without override. */
export interface ConflictResponse {
  code: 'conflict';
  conflicts: Conflict[];
}
