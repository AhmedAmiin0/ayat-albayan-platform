import type { Gender, Program, TeacherStatus } from '../enums/index.js';
import type { LessonView } from './views.js';

// GET /lessons/overview (R-SCH-09 all-teachers calendar): every teacher with their weekly windows,
// time off, load and free time, plus the lessons of the window, in one payload. Instants are ISO UTC.

/** Half-open [starts_at, ends_at). */
export interface Span {
  starts_at: string;
  ends_at: string;
}

export interface OverviewTimeOff extends Span {
  id: string;
  reason: string | null;
}

export interface OverviewTeacher {
  id: string;
  display_name_ar: string;
  gender: Gender;
  programs: Program[];
  tz: string;
  status: TeacherStatus;
  meeting_link: string | null;
  /** Students with this teacher whose status is trial | active. */
  students_count: number;
  max_students: number | null;
  /** Weekly availability inside the window, merged (a 22:00–24:00 + 00:00–02:00 pair is one span). */
  windows: Span[];
  /** teacher_time_off rows overlapping the window, as stored. */
  time_off: OverviewTimeOff[];
  /** windows − time off − occupying lessons, gaps of at least 30 min. */
  free: Span[];
}

export interface ScheduleOverview {
  from: string;
  to: string;
  /** Active teachers plus any inactive one with a lesson in the window, by name. */
  teachers: OverviewTeacher[];
  /** Every status, by starts_at (the clients hide closed ones as on GET /lessons). */
  lessons: LessonView[];
}
