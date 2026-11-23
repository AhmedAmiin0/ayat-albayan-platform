import { zonedWhenText, type ClockCycle, type SalesTeacherFilter, type SalesTeacherView } from '@ab/shared';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';

// Filter rules live in @ab/shared, shared with the mobile screen.

export {
  filterSalesTeachers as filterTeachers,
  isTeacherFilterOn as isFiltered,
  NO_TEACHER_FILTER as NO_FILTER,
  teacherPrograms as programsOf,
} from '@ab/shared';
export type TeacherFilter = SalesTeacherFilter;

/** In the viewer's zone `tz`, which the page states once. */
export const viewerWhen = (instant: string, w: { cycle: ClockCycle; tz: string }): string =>
  zonedWhenText(instant, { weekday: t.enums.weekday, locale, cycle: w.cycle, tz: w.tz });

export const programList = (tc: Pick<SalesTeacherView, 'programs'>): string =>
  tc.programs.map((p) => t.enums.program[p]).join(t.common.listSeparator);
