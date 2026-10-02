import { GENDERS, LESSON_STATUSES, PROGRAMS, type Gender, type LessonStatus, type Program } from '@ab/shared';
import { weekStart } from './tz';

/** /admin/schedule URL state; defaults (this week, everyone, open lessons) stay out of the URL. */
export type ScheduleSearch = {
  /** The day board instead of the week grid. */
  view?: 'day' | undefined;
  /** Riyadh day of the day board, "YYYY-MM-DD"; none = today. */
  day?: string | undefined;
  /** Saturday of the Riyadh week shown. */
  week?: string | undefined;
  /** Picked teachers; none = everyone. `?teacher=<id>` (older links, journeys 1 and 4) reads as one. */
  teachers?: string[] | undefined;
  gender?: Gender | undefined;
  program?: Program | undefined;
  status?: LessonStatus | undefined;
  /** «إظهار الملغية واللي اتغير ميعادها». */
  closed?: true | undefined;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const dateOf = (v: unknown): string | undefined =>
  typeof v === 'string' && DATE.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined;

/** The router JSON-encodes arrays; a typed URL may say `teachers=a,b`. */
function idsOf(s: Record<string, unknown>): string[] | undefined {
  const raw = s['teachers'] ?? s['teacher'];
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : [];
  const ids = [...new Set(list.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()))];
  return ids.length > 0 ? ids : undefined;
}

/** Route `validateSearch`: bad values are dropped, any week date snaps to its Saturday. */
export function parseScheduleSearch(s: Record<string, unknown>): ScheduleSearch {
  const out: ScheduleSearch = {};
  if (s['view'] === 'day') {
    out.view = 'day';
    out.day = dateOf(s['day']);
  }
  const week = dateOf(s['week']);
  if (week && out.view !== 'day') out.week = weekStart(week);
  out.teachers = idsOf(s);
  out.gender = GENDERS.find((g) => g === s['gender']);
  out.program = PROGRAMS.find((p) => p === s['program']);
  out.status = LESSON_STATUSES.find((x) => x === s['status']);
  if (s['closed'] === true || s['closed'] === 'true') out.closed = true;
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
}
