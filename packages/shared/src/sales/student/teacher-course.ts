import type { StudentStatus } from '@ab/catalog';
import type { AttendanceTableRow } from './student-attendance.js';

// docs/47 PR 1: the teacher's student file head (GET /teachers/me/students/:id). Whitelist: the
// course's dates and lesson counts only; never a price, payment, package id, status or renews_on.

/** The course she is teaching (the FIFO-running package), as the teacher may see it. */
export interface TeacherCourseView {
  /** Calendar date (YYYY-MM-DD), shown with no zone shift. */
  starts_on: string;
  /** When the course was stopped («توقفت الدورة»); null otherwise. */
  stopped_at: string | null;
  /** When its last lesson was used (v_subscription_balance.ended_at). */
  ended_at: string | null;
  /** The booked last lesson, when every remaining lesson is booked. */
  projected_end_at: string | null;
  lessons_total: number;
  lessons_used: number;
  lessons_remaining: number;
}

export interface TeacherStudentHead {
  id: string;
  code: string;
  name: string;
  status: StudentStatus;
  course: TeacherCourseView | null;
  /** Her lessons with the student in the next 14 days, cancelled and moved ones included. */
  upcoming: AttendanceTableRow[];
}

export type CourseEndKey = 'stopped' | 'ended' | 'expected' | 'after' | 'unknown';

/** The course's end line: which text, its instant (`at`) or the lessons left (`n`). */
export interface CourseEnd {
  key: CourseEndKey;
  at?: string;
  n?: number;
}

type EndRule = readonly [(c: TeacherCourseView) => boolean, (c: TeacherCourseView) => CourseEnd];

const at = (key: CourseEndKey, iso: string | null): CourseEnd => ({ key, at: iso ?? '' });

/** Ordered: a stop wins over an end, an end over a booked last lesson, that over a count. */
const END_RULES: readonly EndRule[] = [
  [(c) => c.stopped_at !== null, (c) => at('stopped', c.stopped_at)],
  [(c) => c.ended_at !== null, (c) => at('ended', c.ended_at)],
  [(c) => c.projected_end_at !== null, (c) => at('expected', c.projected_end_at)],
  [(c) => c.lessons_remaining > 0, (c) => ({ key: 'after', n: c.lessons_remaining })],
];

/** docs/47 owner call 1: lessons left, or the booked/known end; no estimated date. */
export function courseEndOf(course: TeacherCourseView): CourseEnd {
  const rule = END_RULES.find(([holds]) => holds(course));
  return rule ? rule[1](course) : { key: 'unknown' };
}
