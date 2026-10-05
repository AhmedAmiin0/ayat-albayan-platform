import { DURATIONS, type Duration } from '../enums/index.js';

// Executable specification of the ONE teacher-pay rule (migration 20261005000200): which lessons
// count (public.lesson_counts_for_pay) and what a lesson pays (public.teacher_rate_for). The ledger
// trigger, the monthly payout, the dashboard's teacher cost and the payout settlement all read it.

export interface PayRuleSettings {
  countLate: boolean;
  countNoShow: boolean;
  /** settings.payout_count_trials (default false). */
  countTrials: boolean;
}

export interface PayLesson {
  status: string;
  /** The lesson's rule package is 'trial' (schedule_rules.package). */
  isTrial: boolean;
}

/**
 * Decided from the lesson alone, never from the student's CURRENT status: a student who churns
 * later does not shrink the teacher's history.
 */
export function lessonCountsForPay(l: PayLesson, s: PayRuleSettings): boolean {
  const status = l.status === 'completed' || (l.status === 'late' && s.countLate) || (l.status === 'no_show' && s.countNoShow);
  return status && (!l.isTrial || s.countTrials);
}

export type Rates = Record<Duration, number | null>;

/**
 * 30/45/60/90 → that rate (null = the teacher has none; the admin sets it). Any other length is
 * pro-rated per minute from the nearest length the teacher has a rate for (ties → the longer one),
 * rounded to 2 decimals: 50 min with rate_45 = 70 → 77.78. null when the teacher has no rate.
 */
export function teacherRateFor(minutes: number, rates: Rates): number | null {
  const exact = DURATIONS.find((d) => d === minutes);
  if (exact !== undefined) return rates[exact];
  if (minutes <= 0) return null;
  const slots = DURATIONS.filter((d) => rates[d] !== null).sort(
    (a, b) => Math.abs(a - minutes) - Math.abs(b - minutes) || b - a,
  );
  const slot = slots[0];
  const rate = slot === undefined ? null : rates[slot];
  if (slot === undefined || rate === null) return null;
  return Math.round((rate * minutes * 100) / slot) / 100;
}
