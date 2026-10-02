import type { Gender, LessonView, Program, TeacherStatus } from '@ab/shared';

// GET /lessons/overview?from&to (research-calendar §2, R-SCH-01): every teacher with their day
// windows, time off and free time, plus the window's lessons, in one read. Local mirror of
// packages/shared/src/lessons/overview.ts until that lands with the API (then import it from there).

/** UTC instants, ISO strings. */
export interface Span {
  starts_at: string;
  ends_at: string;
}

export type OverviewTimeOff = Span & { id: string; reason: string | null };

export interface OverviewTeacher {
  id: string;
  display_name_ar: string;
  gender: Gender;
  programs: Program[];
  tz: string;
  status: TeacherStatus;
  meeting_link: string | null;
  students_count: number;
  max_students: number | null;
  /** The weekly availability as instants inside [from, to), merged. */
  windows: Span[];
  time_off: OverviewTimeOff[];
  /** windows minus time off and occupying lessons, gaps of at least 30 minutes. */
  free: Span[];
}

/** `trial` (schedule_rules.package = 'trial') arrives with the API's LessonView change. */
export type OverviewLesson = LessonView & { trial?: boolean };

export interface ScheduleOverview {
  from: string;
  to: string;
  /** Active teachers and any with a lesson in the window, by name. */
  teachers: OverviewTeacher[];
  /** Every status, by start; the agenda hides the closed ones like Today. */
  lessons: OverviewLesson[];
}
