import { clientRequestId } from '@ab/core';
import { z } from 'zod';
import { lessonDuration, overrideSchema } from '../schemas/scheduling';

// A meeting with students is always a lesson, except the standalone internal meeting.

const uniqueIds = z
  .array(z.uuid())
  .min(1)
  .refine((ids) => new Set(ids).size === ids.length, { message: 'duplicate_id' });

/**
 * POST /lessons/instant (admin): one lesson starting now (to the minute) for these students with
 * this teacher. 409 conflict (with `conflicts`) unless `override.reason`, like POST /booking.
 */
export const instantLessonSchema = z.object({
  studentIds: uniqueIds,
  teacherId: z.uuid(),
  durationMin: lessonDuration,
  override: overrideSchema.optional(),
  /** Idempotency key: a double click returns the first lesson (rule 8). */
  clientRequestId: clientRequestId.optional(),
});
export type InstantLessonRequest = z.output<typeof instantLessonSchema>;

export const instantLessonResultSchema = z.object({ lessonId: z.string() });
export type InstantLessonResult = z.infer<typeof instantLessonResultSchema>;

/** POST /public/student/:token/join: the name is optional (the student's first name otherwise). */
export const studentJoinSchema = z.object({
  name: z.string().trim().min(1).max(30).optional(),
});
export type StudentJoin = z.output<typeof studentJoinSchema>;

/** The first word of a name: what the student's page greets with. */
export const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? '';

/** How a student shows in the lesson room (a guest name, ≤ 30): the first name, else the name. */
export const roomNameOfStudent = (name: string): string => (firstName(name) || name).slice(0, 30);
