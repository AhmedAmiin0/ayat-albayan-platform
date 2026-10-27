import type { SalesScheduleLesson } from '../schedule.js';

// «الجدول» of «تفاصيل الطالب» (owner 2026-10-27: «As an assistant i want to see the student schedule»):
// the student's weekly slots and the next lessons. Whitelist: never a meeting link, a price or money.

/** One active weekly rule of the student: its days and wall-clock time in the rule's zone (the family's). */
export interface SalesWeeklySlot {
  rule_id: string;
  /** 0 = الأحد … 6 = السبت, in `tz`, sorted. */
  byday: number[];
  /** "HH:MM" in `tz`. */
  start_time_local: string;
  tz: string;
  duration_min: number;
  teacher_name: string | null;
  /** The next start of each weekday (UTC instants, sorted): the phone reads them in Riyadh and in `tz`. */
  next: string[];
}

/** One upcoming lesson: the sales schedule's lesson without its way in (no meeting link). */
export type SalesStudentLesson = Omit<SalesScheduleLesson, 'meeting_link' | 'platform_classroom'>;

export interface SalesStudentSchedule {
  weekly: SalesWeeklySlot[];
  /** From now, the next SCHEDULE_DAYS days, at most SCHEDULE_LIMIT, by start (a moved-away lesson left out). */
  upcoming: SalesStudentLesson[];
}

/** How far «الحلقات القادمة» looks ahead, and how many it lists at most. */
export const SCHEDULE_DAYS = 14;
export const SCHEDULE_LIMIT = 20;
