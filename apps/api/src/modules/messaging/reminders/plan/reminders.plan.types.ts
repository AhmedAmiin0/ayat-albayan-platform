import type { LessonStatus } from '@ab/catalog';
import type { StaffOnRecord } from './staff-reachable';
import type { TeacherLinks } from './teacher-lesson.crm';

export interface ReminderGuardian {
  id: string;
  phone_e164: string;
  tz: string;
}

export interface ReminderLesson {
  id: string;
  starts_at: string;
  /** The classroom link's expiry (room close) is counted from it. */
  ends_at: string;
  status: LessonStatus;
  meeting_link: string | null;
  /**
   * meeting_mode: teachers.meeting_mode (migration 490), null = the academy default; optional in
   * fakes.
   */
  teacher:
    | ({
        id: string;
        display_name_ar: string;
        phone_e164: string | null;
        tz: string;
        meeting_mode?: string | null;
      } & StaffOnRecord)
    | null;
  students: { id: string; name: string; code?: string | null; guardian: ReminderGuardian | null }[];
}

export interface ReminderPlanInput {
  lessons: readonly ReminderLesson[];
  /** The lesson_reminder rule's minutes_before (legacy: settings.reminder_minutes_before). */
  minutesBefore: number;
  /** lesson_reminder on (default); false = no same-day guardian reminder. */
  sameDay?: boolean;
  /**
   * lesson_reminder_24h on AND approved in the registry; dayBeforeAt = its send_at_local (null =
   * the lesson's time).
   */
  dayBefore: boolean;
  dayBeforeAt?: string | null;
  /**
   * teacher_lesson_reminder on (R-NOT-03; default on) and its lead time (default minutesBefore).
   */
  teacherReminders?: boolean;
  teacherMinutesBefore?: number;
  /** The web origin (firstWebOrigin): the teacher's CRM reminder links are absolute. */
  origin: string;
  /** Per lesson: the teacher's signed join and report links (the job makes them). */
  teacherLinks?: ReadonlyMap<string, TeacherLinks>;
  /** teacher_lesson_v3 approved: the teacher's reminder goes as it. */
  teacherV3?: boolean;
  now: Date;
}
