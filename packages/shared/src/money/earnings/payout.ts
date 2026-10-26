import type { LessonStatus, PayoutStatus } from '../../enums/index.js';

// Teacher payouts (R-PAY-02, R-TCH-04, issue E3): counted lessons × their ledger amount (the
// teacher's per-lesson rate for that length, pay-rule.ts, EGP). One amount per lesson, however
// many students were in it.

/**
 * Lesson statuses that are paid. R-PAY-02 says `completed`; whether a `late` or `no_show` lesson
 * is paid is the owner's call (settings payout_count_late / payout_count_no_show, both OFF).
 */
export function payoutStatuses(input: { countLate: boolean; countNoShow: boolean }): LessonStatus[] {
  return [
    'completed',
    ...(input.countLate ? (['late'] as const) : []),
    ...(input.countNoShow ? (['no_show'] as const) : []),
  ];
}

export interface PayoutLine {
  /** Minutes: 30/45/60/90, or another length pro-rated from the nearest rate (pay-rule.ts). */
  duration: number;
  lessons: number;
  /** null = the teacher has no rate for this duration (see missingRates). */
  rate: number | null;
  amount: number;
}

/** draft → approved → paid. Only a draft is regenerated; approved and paid rows are frozen. */
export const PAYOUT_TRANSITIONS: Record<PayoutStatus, readonly PayoutStatus[]> = {
  draft: ['approved'],
  approved: ['paid'],
  paid: [],
};

export function canTransitionPayout(from: PayoutStatus, to: PayoutStatus): boolean {
  return PAYOUT_TRANSITIONS[from].includes(to);
}

/**
 * Corrections, one step back (migration 20261005000201): an approved payout is reopened to a draft
 * (calculate again), a paid one is un-paid to approved (its settlement payment is voided).
 */
export const PAYOUT_CORRECTIONS: Partial<Record<PayoutStatus, PayoutStatus>> = {
  approved: 'draft',
  paid: 'approved',
};
