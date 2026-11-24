import { z } from 'zod';
import { localDate } from '@ab/core';
import { daysBefore, SALES_START_BACK_DAYS } from '../start-date.js';

// Only starts_on changes; with lessons used before the platform, the start stays before today.

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

/** The earliest day accepted: a year back, as on create. */
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
