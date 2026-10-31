import { z } from 'zod';
import { timeOfDay } from '../../core/schemas/index.js';
import { dayTimesSchema, refineDayTimes } from './day-times.js';
import { bydaySchema, instant, localDate, overrideSchema } from './scheduling.js';

// «تغيير أيام الحلقات» (owner 2026-10-18): new days and times for the lessons of a booked course
// that have not happened yet. The teacher, the length and the zone stay the course's.

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
  /**
   * The admin only, with a reason (R-SCH-04); the assistant is refused (403 override_not_allowed).
   */
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

// «تغيير المعلم» from the student's profile (owner 2026-10-30): the same change with the new
// teacher. The days and times may stay the course's: the rest then moves to the new teacher only.
const teacherBase = changeBase.extend({ teacherId: z.uuid() });

/** POST /students/:id/course-teacher/change/check: nothing written. */
export const courseTeacherCheckSchema = teacherBase.superRefine(refine);

/** POST /students/:id/course-teacher/change: idempotent on clientRequestId (rule 8). */
export const courseTeacherChangeSchema = teacherBase
  .extend({ clientRequestId: z.uuid() })
  .superRefine(refine);

/**
 * GET /students/:id/course-teacher|course-times/change: the package to change; absent = the
 * student's current package (any student: the sales file of a student not hers carries no package
 * id).
 */
export const profileCourseQuerySchema = z.object({ subscriptionId: z.uuid().optional() });

export type CourseTeacherRequest = z.infer<typeof courseTeacherCheckSchema>;
