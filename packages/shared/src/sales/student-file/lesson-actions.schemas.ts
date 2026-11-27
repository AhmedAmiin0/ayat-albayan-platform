import { lessonStatusSchema } from '@ab/catalog';
import { id, instant } from '@ab/core';
import { z } from 'zod';
import { moveReasonSchema } from '../../schemas';

/** One lesson only: no substitute teacher, no clash override. */
export const salesRescheduleSchema = z.strictObject({
  startsAt: instant,
  reason: moveReasonSchema,
});
/** Teacher or student cancels may come after the lesson ended and correct an auto-held one. */
export const salesCancelSchema = z.strictObject({
  reason: z.string().trim().max(500).optional(),
  by: z.enum(['admin', 'teacher', 'student']).optional(),
});
export type SalesReschedule = z.infer<typeof salesRescheduleSchema>;
export type SalesCancel = z.infer<typeof salesCancelSchema>;

/** A moved or confirmed lesson: its id, time and status, never the admin's lesson view. */
export const salesLessonMovedSchema = z.strictObject({
  id: id(),
  starts_at: instant,
  status: lessonStatusSchema,
});
export type SalesLessonMoved = z.infer<typeof salesLessonMovedSchema>;

export const salesLessonStatusSchema = salesLessonMovedSchema.pick({ id: true, status: true });
export type SalesLessonStatus = z.infer<typeof salesLessonStatusSchema>;
