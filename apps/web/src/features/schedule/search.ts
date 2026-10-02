import { LESSON_STATUSES, PROGRAMS, type LessonStatus, type Program } from '@ab/shared';
import { weekStart } from './tz';

/** /admin/schedule URL state; defaults (this week, everyone, open lessons) stay out of the URL. */
export type ScheduleSearch = {
  /** Saturday of the Riyadh week shown. */
  week?: string | undefined;
  teacher?: string | undefined;
  program?: Program | undefined;
  status?: LessonStatus | undefined;
  /** «إظهار الملغية واللي اتغير ميعادها». */
  closed?: true | undefined;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Route `validateSearch`: a bad date / status / program is dropped, any date snaps to its Saturday. */
export function parseScheduleSearch(s: Record<string, unknown>): ScheduleSearch {
  const out: ScheduleSearch = {};
  const week = s['week'];
  if (typeof week === 'string' && DATE.test(week) && !Number.isNaN(Date.parse(week))) out.week = weekStart(week);
  if (typeof s['teacher'] === 'string' && s['teacher']) out.teacher = s['teacher'];
  out.program = PROGRAMS.find((p) => p === s['program']);
  out.status = LESSON_STATUSES.find((x) => x === s['status']);
  if (s['closed'] === true || s['closed'] === 'true') out.closed = true;
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
}
