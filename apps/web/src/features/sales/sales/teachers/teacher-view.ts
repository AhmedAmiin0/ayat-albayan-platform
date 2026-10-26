import { riyadhWhenText, type SalesTeacherFilter, type SalesTeacherView } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';

// «المعلمون» (sales, owner report 2026-10-12). The filter rules live in @ab/shared (the mobile screen
// uses the same ones); here: the web's names for them and the Riyadh time of a next lesson.

export {
  filterSalesTeachers as filterTeachers,
  isTeacherFilterOn as isFiltered,
  NO_TEACHER_FILTER as NO_FILTER,
  teacherPrograms as programsOf,
} from '@ab/shared';
export type TeacherFilter = SalesTeacherFilter;

/** «الأحد 12 أكتوبر 18:00» in Riyadh time (the sales pages' one zone, said once on the page); the mobile's words too. */
export const riyadhWhen = (instant: string): string => riyadhWhenText(instant, { weekday: t.enums.weekday, locale });

/** «القرآن الكريم، اللغة العربية». */
export const programList = (tc: Pick<SalesTeacherView, 'programs'>): string =>
  tc.programs.map((p) => t.enums.program[p]).join(t.common.listSeparator);
