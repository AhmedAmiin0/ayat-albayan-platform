import { id, localDate } from '@ab/core';
import { dayTimeSchema, lessonDuration } from '@ab/schedule';
import { z } from 'zod';

/**
 * One assistant course (the rules sharing a subscription_id, migration 470): its latest set of
 * rules (those ending on the course's last day), each weekday with its time in the rules' zone.
 */
export const bookedCourseSchema = z.object({
  subscriptionId: id(),
  teacherId: id(),
  /** The course teacher's zone (a clash is also shown in it). */
  teacherTz: z.string(),
  durationMin: lessonDuration,
  /** The rules' zone (the family's when booked). */
  tz: z.string(),
  /**
   * The first local day of its latest set of rules (`days`): before it only the old rules of a
   * pending change hold lessons, so the change form's prefill starts on it at the earliest.
   */
  startsOn: localDate,
  /** The course's last local day (its rules' ends_on). */
  endsOn: localDate,
  /** Some active rule of it covers today in its zone: it runs this week. false = starts later. */
  running: z.boolean(),
  /** The first local day ≥ today any active rule of it may still hold a lesson on. */
  opensOn: localDate,
  /** Each weekday (0 = Sunday) with its "HH:MM", in weekday order. */
  days: z.array(dayTimeSchema),
  /** The lessons the course books: lessons_total − lessons_used_before (courseLessonCount). */
  lessonsTotal: z.int(),
  /** Days a week the plan needs (courseDaysPerWeek); null = a custom count the admin books. */
  perWeek: z.int().nullable(),
});
export type BookedCourse = z.infer<typeof bookedCourseSchema>;
