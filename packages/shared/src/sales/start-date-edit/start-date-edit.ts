import { z } from 'zod';
import { localDate } from '@ab/schedule';
import { daysBefore, SALES_START_BACK_DAYS } from '../start-date.js';

// «تعديل تاريخ البدء» (owner 2026-11-03: «i want to be able to change the start date as a special
// assistant»): PATCH /subscriptions/:id/start-date, admins and assistants holding
// subscriptions.edit_terms. Only starts_on changes (renews_on, lessons, rules, payments and
// commissions stay). The range is the sales create's (salesStartDate with «بدأ الاشتراك سابقًا»):
// any day from a year back on; with lessons counted before the platform (lessons_used_before > 0)
// the start stays before today (the used-before rule, usedBeforeProblem). Pure.

/** PATCH /subscriptions/:id/start-date. */
export const startDateEditSchema = z.strictObject({ startsOn: localDate });
export type StartDateEdit = z.output<typeof startDateEditSchema>;

export type StartDateEditProblem =
  | 'already_cancelled'
  | 'start_date_too_old'
  | 'used_before_needs_past_start';

export interface StartDateEditInput {
  /** The day asked for, YYYY-MM-DD. */
  next: string;
  /** Today in the academy's zone (Asia/Riyadh), YYYY-MM-DD. */
  today: string;
  cancelled: boolean;
  lessonsUsedBefore: number;
}

type Bounds = Pick<StartDateEditInput, 'today' | 'lessonsUsedBefore'>;

/** The earliest day the edit accepts: a year back, as the create's «بدأ الاشتراك سابقًا». */
export const startDateEditMin = (today: string): string => daysBefore(today, SALES_START_BACK_DAYS);

const countedBefore = (b: Bounds): boolean => b.lessonsUsedBefore > 0;

/** The latest day: yesterday while lessons are counted before the platform; else open-ended. */
export function startDateEditMax(bounds: Bounds): string | undefined {
  return countedBefore(bounds) ? daysBefore(bounds.today, 1) : undefined;
}

const CHECKS: readonly [StartDateEditProblem, (i: StartDateEditInput) => boolean][] = [
  ['already_cancelled', (i) => i.cancelled],
  ['start_date_too_old', (i) => i.next < startDateEditMin(i.today)],
  ['used_before_needs_past_start', (i) => countedBefore(i) && i.next >= i.today],
];

/** Why the edit is refused (409 already_cancelled, else 400); null = accepted. */
export function startDateEditProblem(input: StartDateEditInput): StartDateEditProblem | null {
  return CHECKS.find(([, refused]) => refused(input))?.[0] ?? null;
}

/** The edit's answer: the package's day only (never a price: assistants edit any student's). */
export const startDateEditResultSchema = z.object({
  subscription_id: z.string(),
  starts_on: z.string(),
});
export type StartDateEditResult = z.infer<typeof startDateEditResultSchema>;
