import { z } from 'zod';
import type { LessonStatus } from '../enums/index.js';

// The salesperson's read-only academy schedule (owner report 2026-10-12: «it is not seeing the schedule»).
// Whitelist: who teaches whom and when, the status and the trial/makeup badges. Never a meeting link,
// a note, a reason, attendance or money.

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
  teacher: { id: string; display_name_ar: string; display_name_en: string | null };
  students: { id: string; code: string; name: string }[];
}

/** GET /sales/schedule: the Riyadh day shown and its lessons by start (a moved-away lesson is left out). */
export interface SalesScheduleDay {
  date: string;
  lessons: SalesScheduleLesson[];
}
