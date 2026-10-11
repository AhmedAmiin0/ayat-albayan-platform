import { clockTime, normalizeArabic, type Gender, type Program, type SalesTeacherView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { dayMonthLabel, RIYADH_TZ, weekdayOf, zonedParts } from '@/features/schedule/tz';

// «المعلمون» (sales, owner report 2026-10-12): the list's filters and the Riyadh time of a next lesson.

export interface TeacherFilter {
  q: string;
  program: Program | '';
  gender: Gender | '';
}

export const NO_FILTER: TeacherFilter = { q: '', program: '', gender: '' };

/** Name (Arabic-normalised, or the English name) contains the search; program and gender match when picked. */
export function filterTeachers(list: readonly SalesTeacherView[], f: TeacherFilter): SalesTeacherView[] {
  const q = normalizeArabic(f.q.trim()).toLowerCase();
  return list.filter(
    (tc) =>
      (!q || normalizeArabic(tc.name).includes(q) || (tc.name_en ?? '').toLowerCase().includes(q)) &&
      (!f.program || tc.programs.includes(f.program)) &&
      (!f.gender || tc.gender === f.gender),
  );
}

/** The programs any teacher teaches, in the catalogue's order, for the program filter. */
export function programsOf(list: readonly SalesTeacherView[], order: readonly Program[]): Program[] {
  return order.filter((p) => list.some((tc) => tc.programs.includes(p)));
}

export const isFiltered = (f: TeacherFilter): boolean => Boolean(f.q.trim() || f.program || f.gender);

const weekday: Record<string, string> = t.enums.weekday;

/** «الأحد 12 أكتوبر 18:00» in Riyadh time (the sales pages' one zone, said once on the page). */
export function riyadhWhen(instant: string): string {
  const at = new Date(instant);
  const { date } = zonedParts(at, RIYADH_TZ);
  return `${weekday[String(weekdayOf(date))] ?? ''} ${dayMonthLabel(date)} ${clockTime(at, RIYADH_TZ)}`;
}

/** «القرآن الكريم، اللغة العربية». */
export const programList = (tc: Pick<SalesTeacherView, 'programs'>): string =>
  tc.programs.map((p) => t.enums.program[p]).join(t.common.listSeparator);
