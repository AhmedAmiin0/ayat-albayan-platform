import { courseDaysPerWeek } from './course/course.js';
import { addCalendarDays } from '../time/index.js';

// The subscription start day of the sales subscribe (owner 2026-10-12, docs/16 row 24). Pure: the API
// enforces it, web and mobile use it to show the same error before posting.
// Without subscriptions.set_start_date: the default day (today, Riyadh: the admin form's default too); an
// explicit other day is 403 start_date_not_allowed. With it: today or later, or a PAST day only when
// «بدأ الاشتراك سابقًا» is ticked (a student who subscribed before the platform), at most a year back.

/** How far back «بدأ الاشتراك سابقًا» may go. */
export const SALES_START_BACK_DAYS = 365;

export type SalesStartProblem = 'start_date_not_allowed' | 'start_date_past' | 'start_date_too_old';

export interface SalesStartInput {
  /** YYYY-MM-DD as sent; undefined = the default day. */
  startsOn?: string | undefined;
  alreadyStarted?: boolean | undefined;
  /** Holds subscriptions.set_start_date. */
  canSet: boolean;
  /** Today in the academy's zone, YYYY-MM-DD (the default day). */
  today: string;
}

export type SalesStartResult = { ok: true; startsOn: string } | { ok: false; code: SalesStartProblem };

/** YYYY-MM-DD minus n days (addCalendarDays, negated). */
export function daysBefore(day: string, n: number): string {
  return addCalendarDays(day, -n);
}

export function salesStartDate(input: SalesStartInput): SalesStartResult {
  const { startsOn, today } = input;
  if (!input.canSet) {
    if ((startsOn === undefined || startsOn === today) && !input.alreadyStarted) return { ok: true, startsOn: today };
    return { ok: false, code: 'start_date_not_allowed' };
  }
  if (startsOn === undefined || startsOn >= today) return { ok: true, startsOn: startsOn ?? today };
  if (!input.alreadyStarted) return { ok: false, code: 'start_date_past' };
  if (startsOn < daysBefore(today, SALES_START_BACK_DAYS)) return { ok: false, code: 'start_date_too_old' };
  return { ok: true, startsOn };
}

// «حلقات مستخدمة من الباقة» (owner 2026-10-28, migration 932): lessons the student took before the
// platform, counted as used; the course books only the rest. Only with a past start (the «بدأ الاشتراك
// سابقًا» path, subscriptions.set_start_date), never the whole package (subscriptions check), and at least
// one lesson left per course day (8 lessons, 2 days a week: at most 6), else the course cannot book its days.

export type UsedBeforeProblem = 'used_before_not_allowed' | 'used_before_needs_past_start' | 'used_before_too_many';

export interface UsedBeforeInput {
  lessonsUsedBefore: number;
  /** The start day the package is stored with, YYYY-MM-DD. */
  startsOn: string;
  /** Today in the academy's zone, YYYY-MM-DD. */
  today: string;
  canSet: boolean;
  lessonsTotal: number;
}

/** Why lessonsUsedBefore is refused (403 for not_allowed, 400 otherwise); null = accepted. 0 is always fine. */
export function usedBeforeProblem(input: UsedBeforeInput): UsedBeforeProblem | null {
  if (input.lessonsUsedBefore === 0) return null;
  if (!input.canSet) return 'used_before_not_allowed';
  if (input.startsOn >= input.today) return 'used_before_needs_past_start';
  return input.lessonsUsedBefore <= usedBeforeMax(input.lessonsTotal) ? null : 'used_before_too_many';
}

/**
 * The stepper's last value: one lesson left per course day (courseDaysPerWeek; a package's lessons are
 * its size, so lessons_total alone gives it), else every lesson but one (a custom count the admin books).
 */
export function usedBeforeMax(lessonsTotal: number): number {
  const left = courseDaysPerWeek({ package: null, lessons_total: lessonsTotal }) ?? 1;
  return Math.max(0, lessonsTotal - left);
}
