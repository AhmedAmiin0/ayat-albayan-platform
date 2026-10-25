import { clockTime, type SalesTeacherFilter, type SalesTeacherView } from '@ab/shared';
import { dayMonthLabel, RIYADH_TZ, weekdayOf, zonedParts } from '@/features/schedule/tz';
import { t } from '@/lib/i18n/i18n';

// «المعلمون» (sales, owner report 2026-10-12). The filter rules live in @ab/shared (the mobile screen
// uses the same ones); here: the web's names for them and the Riyadh time of a next lesson.

export {
  filterSalesTeachers as filterTeachers,
  isTeacherFilterOn as isFiltered,
  NO_TEACHER_FILTER as NO_FILTER,
  teacherPrograms as programsOf,
} from '@ab/shared';
export type TeacherFilter = SalesTeacherFilter;

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
