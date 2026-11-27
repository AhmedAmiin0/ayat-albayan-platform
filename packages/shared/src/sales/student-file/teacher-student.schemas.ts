import { STUDENT_STATUSES } from '@ab/catalog';
import { id, instant, localDate } from '@ab/core';
import { z } from 'zod';
import { attendanceTableRowSchema } from './attendance.schemas';

// The teacher's student file head (docs/47 PR 1). Whitelist: the course's dates and lesson counts
// only; never a price, payment, package id, status or renews_on.

const count = z.number().int().nonnegative();

/** The course she is teaching (the FIFO-running package), as the teacher may see it. */
export const teacherCourseViewSchema = z.strictObject({
  /** Shown with no zone shift. */
  starts_on: localDate,
  stopped_at: instant.nullable(),
  /** When its last lesson was used (v_subscription_balance.ended_at). */
  ended_at: instant.nullable(),
  /** The booked last lesson, when every remaining lesson is booked. */
  projected_end_at: instant.nullable(),
  lessons_total: count,
  lessons_used: count,
  lessons_remaining: count,
});
export type TeacherCourseView = z.infer<typeof teacherCourseViewSchema>;

export const teacherStudentHeadSchema = z.strictObject({
  id: id(),
  code: z.string(),
  name: z.string(),
  status: z.enum(STUDENT_STATUSES),
  course: teacherCourseViewSchema.nullable(),
  /** Her lessons with the student in the next 14 days, cancelled and moved ones included. */
  upcoming: z.array(attendanceTableRowSchema),
});
export type TeacherStudentHead = z.infer<typeof teacherStudentHeadSchema>;
