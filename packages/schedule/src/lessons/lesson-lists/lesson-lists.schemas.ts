import { GENDERS, PROGRAMS, TEACHER_STATUSES } from '@ab/catalog';
import { id, instant, localDate, timeZone } from '@ab/core';
import { z } from 'zod';
import { lessonViewSchema } from '../lesson-view';

// GET /lessons/overview (R-SCH-09 all-teachers calendar): every teacher with their weekly
// windows, time off, load and free time, plus the lessons of the window, in one payload.
// Instants are ISO UTC.

/** `?from&to[&teacherId]`: the window [from, to); the api also caps it at 31 days. */
export const lessonWindowQuerySchema = z
  .object({ from: instant, to: instant, teacherId: z.uuid().optional() })
  .refine((q) => Date.parse(q.to) > Date.parse(q.from), {
    message: 'to_before_from',
    path: ['to'],
  });
export type LessonWindowQuery = z.input<typeof lessonWindowQuerySchema>;

/** `?date&tz`: one local day; no tz means the academy's. */
export const lessonDayQuerySchema = z.object({ date: localDate, tz: timeZone.optional() });
export type LessonDayQuery = z.input<typeof lessonDayQuerySchema>;

/** Half-open [starts_at, ends_at). */
export const spanSchema = z.object({ starts_at: z.string(), ends_at: z.string() });
export type Span = z.infer<typeof spanSchema>;

export const overviewTimeOffSchema = spanSchema.extend({
  id: id(),
  reason: z.string().nullable(),
});
export type OverviewTimeOff = z.infer<typeof overviewTimeOffSchema>;

export const overviewTeacherSchema = z.object({
  id: id(),
  display_name_ar: z.string(),
  /** null until the admin sets it; clients fall back to the Arabic name (teacherName). */
  display_name_en: z.string().nullish(),
  gender: z.enum(GENDERS),
  programs: z.array(z.enum(PROGRAMS)),
  tz: z.string(),
  status: z.enum(TEACHER_STATUSES),
  meeting_link: z.string().nullable(),
  /** The teacher's photo, a short-lived signed URL; null or absent: initials. */
  avatar_url: z.string().nullish(),
  /** Students with this teacher whose status is trial | active. */
  students_count: z.number().int(),
  max_students: z.number().int().nullable(),
  /** Weekly availability inside the window, merged across midnight. */
  windows: z.array(spanSchema),
  /** teacher_time_off rows overlapping the window, as stored. */
  time_off: z.array(overviewTimeOffSchema),
  /** windows − time off − occupying lessons, gaps of at least 30 min. */
  free: z.array(spanSchema),
});
export type OverviewTeacher = z.infer<typeof overviewTeacherSchema>;

export const scheduleOverviewSchema = z.object({
  from: z.string(),
  to: z.string(),
  /** Active teachers plus any inactive one with a lesson in the window, by name. */
  teachers: z.array(overviewTeacherSchema),
  /** Every status, by starts_at (the clients hide closed ones as on GET /lessons). */
  lessons: z.array(lessonViewSchema),
});
export type ScheduleOverview = z.infer<typeof scheduleOverviewSchema>;
