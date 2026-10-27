import type { SalesScheduleLesson } from '../schedule.js';

// «الجدول» of «تفاصيل الطالب» (owner 2026-10-27: «As an assistant i want to see the student schedule»):
// the student's weekly slots and the next lessons. Whitelist: never a meeting link, a price or money.

/** One active weekly rule of the student: its days and wall-clock time in the rule's zone (imported: Riyadh). */
export interface SalesWeeklySlot {
  rule_id: string;
  /** 0 = الأحد … 6 = السبت, in `tz`, sorted. */
  byday: number[];
  /** "HH:MM" in `tz`. */
  start_time_local: string;
  tz: string;
  duration_min: number;
  /** Both names: the phone shows the one of its language (localizedName). */
  teacher: { display_name_ar: string; display_name_en: string | null } | null;
  /** The next start of each weekday (UTC instants, sorted): the phone reads them in Riyadh and in the student's zone. */
  next: string[];
}

/** One upcoming lesson: the sales schedule's lesson without its way in (no meeting link). */
export type SalesStudentLesson = Omit<SalesScheduleLesson, 'meeting_link' | 'platform_classroom'>;

export interface SalesStudentSchedule {
  /** The student's own zone (students.tz): «عند الطالب» reads `next` in it, not in the rule's zone. */
  student_tz: string;
  weekly: SalesWeeklySlot[];
  /** Open lessons (scheduled / confirmed) from now, the next SCHEDULE_DAYS days, at most SCHEDULE_LIMIT, by start. */
  upcoming: SalesStudentLesson[];
}

/** How far «الحلقات القادمة» looks ahead, and how many it lists at most. */
export const SCHEDULE_DAYS = 14;
export const SCHEDULE_LIMIT = 20;
