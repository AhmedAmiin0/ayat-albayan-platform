import { z } from 'zod';
import type { LessonStatus } from '../enums/index.js';

// The salesperson's read-only academy schedule (owner report 2026-10-12: «it is not seeing the schedule»).
// Whitelist: who teaches whom and when, the status, the trial/makeup badges and the way in (owner
// 2026-10-26: sales see the lesson's meeting link). Never a note, a reason, attendance or money.

/** `?date=YYYY-MM-DD` (a Riyadh day; today when absent) `&teacherId=` (one teacher, optional). */
export const salesScheduleQuerySchema = z.object({
  date: z.iso.date().optional(),
  teacherId: z.uuid().optional(),
});
export type SalesScheduleQuery = z.output<typeof salesScheduleQuerySchema>;

/** One lesson of the day: time (UTC instants), teacher, students, status and badges. */
export interface SalesScheduleLesson {
  id: string;
  starts_at: string;
  ends_at: string;
  status: LessonStatus;
  trial: boolean;
  makeup: boolean;
  /** The lesson's copied meeting link (trimmed, empty → null). Optional: an old persisted cache lacks it. */
  meeting_link?: string | null;
  /** The teacher holds it in our classroom (meeting_mode, else the academy default): «عبر الفصل», no URL. */
  platform_classroom?: boolean;
  /** tz: the teacher's and each student's zone, for the details sheet's local times. Absent in an old cache. */
  teacher: { id: string; display_name_ar: string; display_name_en: string | null; tz?: string };
  students: { id: string; code: string; name: string; tz?: string }[];
}

/** GET /sales/schedule: the Riyadh day shown and its lessons by start (a moved-away lesson is left out). */
export interface SalesScheduleDay {
  date: string;
  lessons: SalesScheduleLesson[];
}
