import { matchesQuery } from '@ab/core';
import type { Gender, Program } from '@ab/catalog';
import type { SalesTeacherView } from '../teacher/academy-lists.schemas';
import type { SalesScheduleLesson } from '../teacher/academy-day.schemas';
import { isOpenLesson } from '@ab/schedule';

// The salesperson's teachers and schedule, same rules on web and mobile.

export interface SalesTeacherFilter {
  q: string;
  program: Program | '';
  gender: Gender | '';
}

export const NO_TEACHER_FILTER: SalesTeacherFilter = { q: '', program: '', gender: '' };

/** Name (Arabic-normalised, or the English name) contains the search; program and gender match when picked. */
export function filterSalesTeachers(
  list: readonly SalesTeacherView[],
  f: SalesTeacherFilter,
): SalesTeacherView[] {
  return list.filter(
    (tc) =>
      matchesQuery([tc.name, tc.name_en ?? ''], f.q) &&
      (!f.program || tc.programs.includes(f.program)) &&
      (!f.gender || tc.gender === f.gender),
  );
}

export const isTeacherFilterOn = (f: SalesTeacherFilter): boolean =>
  Boolean(f.q.trim() || f.program || f.gender);

/** The programs any teacher teaches, in the catalogue's order, for the program filter. */
export function teacherPrograms(
  list: readonly SalesTeacherView[],
  order: readonly Program[],
): Program[] {
  return order.filter((p) => list.some((tc) => tc.programs.includes(p)));
}

/** start <= now < end and still open: the lesson is running and joinable. */
export function isRunningLesson(
  lesson: Pick<SalesScheduleLesson, 'status' | 'starts_at' | 'ends_at'>,
  now: Date,
): boolean {
  const at = now.getTime();
  return (
    isOpenLesson(lesson.status) &&
    Date.parse(lesson.starts_at) <= at &&
    at < Date.parse(lesson.ends_at)
  );
}

/** Any still-scheduled, unended lesson with lessons.confirm; the API checks again. */
export function canSalesConfirm(
  lesson: Pick<SalesScheduleLesson, 'status' | 'ends_at'>,
  input: { now: Date; holds: boolean },
): boolean {
  return (
    input.holds && lesson.status === 'scheduled' && Date.parse(lesson.ends_at) > input.now.getTime()
  );
}

type ChangeKey = 'lessons.reschedule' | 'lessons.cancel';

/**
 * May sales move or cancel this lesson (docs/16 row 37)? Open, not over and with a student, ANY
 * student's, each action behind its own key. Web and mobile alike; the API
 * checks again.
 */
export function canSalesChangeLesson(
  lesson: Pick<SalesScheduleLesson, 'status' | 'ends_at' | 'students'>,
  input: { now: Date; can: (key: ChangeKey) => boolean },
): { reschedule: boolean; cancel: boolean } {
  const notOver = Date.parse(lesson.ends_at) > input.now.getTime();
  const ok = isOpenLesson(lesson.status) && notOver && lesson.students.length > 0;
  return {
    reschedule: ok && input.can('lessons.reschedule'),
    cancel: ok && input.can('lessons.cancel'),
  };
}
