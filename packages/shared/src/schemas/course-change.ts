import { z } from 'zod';
import { timeOfDay } from './common.js';
import { dayTimesSchema, refineDayTimes } from './day-times.js';
import { bydaySchema, instant, localDate, overrideSchema } from './scheduling.js';

// «تغيير أيام الحلقات» (owner 2026-10-18): new days and times for the lessons of a booked course that
// have not happened yet. The teacher, the length and the zone stay the course's.

const changeBase = z.object({
  /** The course (its rules' subscription_id, migration 470). */
  subscriptionId: z.uuid(),
  byday: bydaySchema,
  startTimeLocal: timeOfDay,
  /** The first new lesson's local date: the change point. */
  startsOn: localDate,
  /** The first new lesson (the earliest pick); must be in the future. */
  startsAt: instant,
  dayTimes: dayTimesSchema,
  /** The admin only, with a reason (R-SCH-04); the assistant is refused (403 override_not_allowed). */
  override: overrideSchema.optional(),
  clientRequestId: z.uuid().optional(),
});

const refine = (req: z.infer<typeof changeBase>, ctx: z.RefinementCtx) => refineDayTimes({ ...req, kind: 'package' }, ctx);

/** POST …/course/change/check: the same body, nothing written. */
export const courseChangeCheckSchema = changeBase.superRefine(refine);

/** POST …/course/change: idempotent on clientRequestId (rule 8). */
export const courseChangeSchema = changeBase.extend({ clientRequestId: z.uuid() }).superRefine(refine);

/** GET /booking/course/change?subscriptionId= (the admin's read of a course to change). */
export const courseChangeQuerySchema = z.object({ subscriptionId: z.uuid() });

export type CourseChangeRequest = z.infer<typeof courseChangeCheckSchema>;
