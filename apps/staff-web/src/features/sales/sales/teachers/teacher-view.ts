import type { SalesTeacherFilter, SalesTeacherView } from '@ab/shared';
import { zonedWhenText, type ClockCycle } from '@ab/time';
import { t, locale } from '@ab/web-kit';

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
