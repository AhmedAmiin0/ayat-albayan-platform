import type { Duration, LessonStatus, PayoutStatus } from '../enums/index.js';
import { DURATIONS } from '../enums/index.js';

// Teacher payouts (R-PAY-02, R-TCH-04, issue E3): counted lessons × the teacher's per-lesson rate
// for that duration (teachers.rate_30/45/60/90, EGP). One amount per lesson, however many
// students were in it.

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
  duration: Duration;
  lessons: number;
  /** null = the teacher has no rate for this duration (see missingRates). */
  rate: number | null;
  amount: number;
}

export interface PayoutCalc {
  lessonsCount: number;
  /** EGP; lines without a rate add nothing. */
  amount: number;
  lines: PayoutLine[];
  /** Durations taught without a rate: the API refuses to generate (409 rate_missing). */
  missingRates: Duration[];
}

/** `lessons`: how many paid lessons per duration; `rates`: the teacher's rate per duration. */
export function payoutFor(input: {
  lessons: Partial<Record<Duration, number>>;
  rates: Record<Duration, number | null>;
}): PayoutCalc {
  const lines: PayoutLine[] = DURATIONS.flatMap((duration) => {
    const lessons = input.lessons[duration] ?? 0;
    if (lessons <= 0) return [];
    const rate = input.rates[duration];
    return [{ duration, lessons, rate, amount: rate === null ? 0 : lessons * rate }];
  });
  return {
    lessonsCount: lines.reduce((n, l) => n + l.lessons, 0),
    amount: lines.reduce((n, l) => n + l.amount, 0),
    lines,
    missingRates: lines.filter((l) => l.rate === null).map((l) => l.duration),
  };
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
