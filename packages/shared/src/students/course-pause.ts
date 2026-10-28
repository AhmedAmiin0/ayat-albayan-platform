import { z } from 'zod';
import { daysBetween } from '../lessons/index.js';
import { localDate } from '../schemas/index.js';
import { addDays } from '../time-zone/index.js';

// «إيقاف الدورة مؤقتًا» (owner 2026-10-28, docs/11 §7b): a pause of a student's course between two Riyadh
// days. The database (migrations 950–952) does the work; these are the contracts and the day arithmetic it
// mirrors, so the API's checks and the sheet's preview say what the RPCs will do. Dates are "YYYY-MM-DD".

/** The cancel_reason the pause writes on the lessons it cancels (migration 951); data, not a UI string. */
export const COURSE_PAUSE_REASON = 'إيقاف مؤقت';
export const COURSE_PAUSE_REASON_MAX = 300;

/** POST /students/:id/course-pause. fromDate defaults to Riyadh today; untilDate null = until «استئناف». */
export const coursePauseStartSchema = z
  .object({
    fromDate: localDate.optional(),
    untilDate: localDate.nullish(),
    reason: z.string().trim().max(COURSE_PAUSE_REASON_MAX).nullish(),
  })
  .strict();
export type CoursePauseStart = z.infer<typeof coursePauseStartSchema>;

/** PATCH /students/:id/course-pause/until: extend or shorten the open pause (null = until «استئناف»). */
export const coursePauseUntilSchema = z.object({ untilDate: localDate.nullable() }).strict();
export type CoursePauseUntil = z.infer<typeof coursePauseUntilSchema>;

/** GET /students/:id/course-pause/preview?from=&until= (until empty = open-ended). */
export const coursePausePreviewQuery = z.object({ from: localDate.optional(), until: localDate.optional() });

export interface CoursePauseView {
  id: string;
  from_date: string;
  /** null = until «استئناف». */
  until_date: string | null;
  reason: string | null;
  created_at: string;
  created_by_name: string | null;
  resumed_at: string | null;
  /** The Riyadh days the package's and the rules' dates moved forward (null while open). */
  extended_days: number | null;
}

/** GET /students/:id/course-pause: the open pause (at most one) and the past ones, newest first. */
export interface CoursePauseState {
  open: CoursePauseView | null;
  history: CoursePauseView[];
}

/** The sheet's line «ستُلغى N حلقات…»: lessons the window takes the student out of (cancelled or left). */
export interface CoursePausePreview {
  from_date: string;
  until_date: string | null;
  lessons: number;
}

/** A start, an until change or a resume; `conflicts`: clashes of the lessons booked again on resume. */
export interface CoursePauseResult {
  pause: CoursePauseView;
  cancelled: number;
  left: number;
  reopened: number;
  conflicts: number;
}

/** The first day lessons come back: the manual resume day (today) or the day after until, the earlier. */
export function resumeDayOf(p: { until: string | null; today: string }): string {
  const after = p.until === null ? null : addDays(p.until, 1);
  return after !== null && after < p.today ? after : p.today;
}

/** The days a resume moves the package's renews_on and the rules' ends_on forward (never negative). */
export function pausedDays(p: { from: string; until: string | null; today: string }): number {
  return Math.max(0, daysBetween(p.from, resumeDayOf(p)));
}

/** A date moved by a resume: null stays null (no renewal date, an open-ended rule). */
export const shiftedOrNull = (date: string | null, days: number): string | null =>
  date === null ? null : addDays(date, days);

export type CoursePauseProblem = 'date_in_past' | 'invalid_range';

/** The API's 400 before the RPC: from before Riyadh today, or until before from. */
export function coursePauseProblem(p: { from: string; until: string | null; today: string }): CoursePauseProblem | null {
  if (p.from < p.today) return 'date_in_past';
  if (p.until !== null && p.until < p.from) return 'invalid_range';
  return null;
}

/** Whether a pause holds the student's course today (from ≤ today and not past until). */
export function pauseCovers(pause: Pick<CoursePauseView, 'from_date' | 'until_date' | 'resumed_at'>, today: string): boolean {
  if (pause.resumed_at !== null) return false;
  return pause.from_date <= today && (pause.until_date === null || pause.until_date >= today);
}
