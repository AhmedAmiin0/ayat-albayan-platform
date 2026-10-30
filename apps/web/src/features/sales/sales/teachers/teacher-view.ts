import { riyadhWhenText, type ClockCycle, type SalesTeacherFilter, type SalesTeacherView } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';

// «المعلمون» (sales, owner report 2026-10-12). The filter rules live in @ab/shared (the mobile screen
// uses the same ones); here: the web's names for them and the viewer's time of a next lesson.

export {
  filterSalesTeachers as filterTeachers,
  isTeacherFilterOn as isFiltered,
  NO_TEACHER_FILTER as NO_FILTER,
  teacherPrograms as programsOf,
} from '@ab/shared';
export type TeacherFilter = SalesTeacherFilter;

/** «الأحد 12 أكتوبر 18:00» (or «6:00 م») in the viewer's zone `tz` (said once on the page). */
export const viewerWhen = (instant: string, w: { cycle: ClockCycle; tz: string }): string =>
  riyadhWhenText(instant, { weekday: t.enums.weekday, locale, cycle: w.cycle, tz: w.tz });

/** «القرآن الكريم، اللغة العربية». */
export const programList = (tc: Pick<SalesTeacherView, 'programs'>): string =>
  tc.programs.map((p) => t.enums.program[p]).join(t.common.listSeparator);
