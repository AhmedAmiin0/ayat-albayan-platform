import type { TeacherCourseView } from '../student-file/teacher-student.schemas';

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
