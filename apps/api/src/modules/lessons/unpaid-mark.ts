import { isOpenLesson, type LessonView } from '@ab/shared';
import type { LessonRow } from './lesson-row';

/** A lesson that has not started yet and can still happen: the only ones R-SUB-02 flags. */
function upcoming(lesson: { status: LessonRow['status']; starts_at: string }, now: number): boolean {
  return isOpenLesson(lesson.status) && Date.parse(lesson.starts_at) > now;
}

/** Students on upcoming lessons: the ones UnpaidFlags needs to look at. */
export function upcomingStudentIds(rows: readonly LessonRow[], now: number): string[] {
  return rows.filter((r) => upcoming(r, now)).flatMap((r) => r.lesson_students.map((s) => s.student_id));
}

/** Sets `unpaid: true` on flagged students of an upcoming lesson (R-SUB-02); others unchanged. */
export function markUnpaid(view: LessonView, flagged: ReadonlySet<string>, now: number): LessonView {
  if (flagged.size === 0 || !upcoming(view, now)) return view;
  if (!view.students.some((s) => flagged.has(s.id))) return view;
  return { ...view, students: view.students.map((s) => (flagged.has(s.id) ? { ...s, unpaid: true } : s)) };
}
