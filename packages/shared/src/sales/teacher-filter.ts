import { normalizeArabic } from '../arabic.js';
import type { Gender, Program } from '../enums/index.js';
import type { SalesTeacherView } from './academy.js';
import type { SalesScheduleLesson } from './schedule.js';
import { isOpenLesson } from '../lessons/state-machine.js';

// «المعلمون» and «جدول الحلقات» of the salesperson, the same rules on web and mobile (owner rule: in sync).

export interface SalesTeacherFilter {
  q: string;
  program: Program | '';
  gender: Gender | '';
}

export const NO_TEACHER_FILTER: SalesTeacherFilter = { q: '', program: '', gender: '' };

/** Name (Arabic-normalised, or the English name) contains the search; program and gender match when picked. */
export function filterSalesTeachers(list: readonly SalesTeacherView[], f: SalesTeacherFilter): SalesTeacherView[] {
  const q = normalizeArabic(f.q);
  return list.filter(
    (tc) =>
      (!q || normalizeArabic(tc.name).includes(q) || normalizeArabic(tc.name_en ?? '').includes(q)) &&
      (!f.program || tc.programs.includes(f.program)) &&
      (!f.gender || tc.gender === f.gender),
  );
}

export const isTeacherFilterOn = (f: SalesTeacherFilter): boolean => Boolean(f.q.trim() || f.program || f.gender);

/** The programs any teacher teaches, in the catalogue's order, for the program filter. */
export function teacherPrograms(list: readonly SalesTeacherView[], order: readonly Program[]): Program[] {
  return order.filter((p) => list.some((tc) => tc.programs.includes(p)));
}

/** start <= now < end and still open: the lesson is running (it gets «ادخل الحلقة»). */
export function isRunningLesson(lesson: Pick<SalesScheduleLesson, 'status' | 'starts_at' | 'ends_at'>, now: Date): boolean {
  const at = now.getTime();
  return isOpenLesson(lesson.status) && Date.parse(lesson.starts_at) <= at && at < Date.parse(lesson.ends_at);
}
