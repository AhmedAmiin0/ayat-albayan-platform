import { id, instant, localDate } from '@ab/core';
import { conflictSchema } from '@ab/schedule';
import { z } from 'zod';
import { bookedCourseSchema } from '../booked-course.schemas';

/** POST …/change/check: the clashes over the whole remaining course, and what is left. */
export const courseChangeCheckResultSchema = z.object({
  conflicts: z.array(conflictSchema),
  /** Lessons the new days carry (lessons_total − counted). */
  remaining: z.int(),
  /** The local date of the remaining-th new lesson: the new rules' ends_on. */
  endsOn: localDate,
});
export type CourseChangeCheck = z.infer<typeof courseChangeCheckResultSchema>;

/** POST …/change: the course's new rules (the first one first) and its new last day. */
export const courseChangeResultSchema = z.object({
  subscriptionId: id(),
  ruleIds: z.array(id()),
  endsOn: localDate.nullable(),
});
export type CourseChangeResult = z.infer<typeof courseChangeResultSchema>;

/** What the change dialog needs: the student and the course to change. */
export const courseChangeViewSchema = z.object({
  student: z.object({ id: id(), name: z.string(), code: z.string(), tz: z.string() }),
  course: bookedCourseSchema,
});
export type CourseChangeView = z.infer<typeof courseChangeViewSchema>;

/** The profile's view adds the course's next open lesson (local date, course zone); null = none. */
export const profileCourseViewSchema = courseChangeViewSchema.extend({
  nextLesson: z.object({ startsOn: localDate, startsAt: instant }).nullable(),
});
export type ProfileCourseView = z.infer<typeof profileCourseViewSchema>;
