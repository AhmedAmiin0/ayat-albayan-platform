import { lessonStatusSchema } from '@ab/catalog';
import { z } from 'zod';

// The salesperson's read-only academy schedule.
// Whitelist: who teaches whom and when, the status, the trial/makeup badges and the way in (sales
// see the lesson's meeting link). Never a note, a reason, attendance or money.

/** `?date=YYYY-MM-DD` (a Riyadh day; today when absent) `&teacherId=` (one teacher, optional). */
export const salesScheduleQuerySchema = z.object({
  date: z.iso.date().optional(),
  teacherId: z.uuid().optional(),
});
export type SalesScheduleQuery = z.output<typeof salesScheduleQuerySchema>;

/** tz: the teacher's zone, for the details sheet's local times. Absent in an old cache. */
export const salesScheduleTeacherSchema = z.object({
  id: z.string(),
  display_name_ar: z.string(),
  display_name_en: z.string().nullable(),
  tz: z.string().optional(),
});

/** `mine` (docs/16 row 36): opens details and lets her move or cancel the lesson. */
export const salesScheduleStudentSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  tz: z.string().optional(),
  mine: z.boolean().optional(),
});

/** One lesson of the day: time (UTC instants), teacher, students, status and badges. */
export const salesScheduleLessonSchema = z.object({
  id: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  status: lessonStatusSchema,
  trial: z.boolean(),
  makeup: z.boolean(),
  /** docs/46 D1: the teacher said she will attend (never the status); absent in an old cache. */
  teacher_confirmed_at: z.string().nullable().optional(),
  /** The lesson's copied meeting link (trimmed, empty → null); absent in an old cache. */
  meeting_link: z.string().nullable().optional(),
  /** Held in our classroom (meeting_mode, else the academy default), so there is no URL. */
  platform_classroom: z.boolean().optional(),
  teacher: salesScheduleTeacherSchema,
  students: z.array(salesScheduleStudentSchema),
});
export type SalesScheduleLesson = z.infer<typeof salesScheduleLessonSchema>;

/** The Riyadh day shown and its lessons by start (a moved-away lesson is left out). */
export const salesScheduleDaySchema = z.object({
  date: z.string(),
  lessons: z.array(salesScheduleLessonSchema),
});
export type SalesScheduleDay = z.infer<typeof salesScheduleDaySchema>;
