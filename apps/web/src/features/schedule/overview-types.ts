import type { Gender, LessonView, Program, TeacherStatus } from '@ab/shared';

// GET /lessons/overview?from&to (research-calendar §2). Defined here until the API branch adds
// packages/shared/src/lessons/overview.ts; then these become re-exports of @ab/shared.

/** [starts_at, ends_at) as UTC ISO instants. */
export interface Span {
  starts_at: string;
  ends_at: string;
}

export interface OverviewTimeOff extends Span {
  id: string;
  reason: string | null;
}

/** One teacher with the window's weekly hours, time off and free gaps (≥ 30 min), all UTC. */
export interface OverviewTeacher {
  id: string;
  display_name_ar: string;
  gender: Gender;
  programs: Program[];
  tz: string;
  status: TeacherStatus;
  meeting_link: string | null;
  /** Students with status trial / active (the load meter). */
  students_count: number;
  max_students: number | null;
  windows: Span[];
  time_off: OverviewTimeOff[];
  free: Span[];
}

/** A lesson plus its trial tag (schedule_rules.package = 'trial'); optional until shared lands. */
export type BoardLesson = LessonView & { trial?: boolean };

export interface ScheduleOverview {
  from: string;
  to: string;
  /** Active teachers, plus inactive ones with a lesson in the window; by name. */
  teachers: OverviewTeacher[];
  /** Every status, by starts_at. */
  lessons: BoardLesson[];
}
