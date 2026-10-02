import type { Json } from '@ab/db';
import { DURATIONS, type Duration, type ExpenseCategory, type LeadSource } from '@ab/shared';
import { readBreakdown } from '../payouts/payouts.mapper';
import type { SourceKey } from './dashboard.types';
import type { CostFact, ExpenseFact, PaymentFact } from './finance';
import { riyadhMonth } from './range';

// DB rows → finance facts (pure). A lesson's cost is the teacher's rate for its duration (EGP,
// teachers.rate_30/45/60/90, same as payoutFor); no rate → the lesson is "unrated", cost unknown.
// A lesson inside an approved or paid payout costs the rate frozen in that payout instead, so a
// closed month keeps the cost the teacher was actually paid after a rate change (R-RPT-02, E3).
// A payment of a package priced in USD is booked at the SAR rate of its quote (subscriptions
// fx_rate), so a closed month's revenue does not move with today's rate.

type Source = { source: LeadSource | null } | null;
type Rates = { rate_30: number | null; rate_45: number | null; rate_60: number | null; rate_90: number | null };

export interface PaymentIn {
  amount: number;
  currency: string;
  paid_at: string;
  subscription: { fx_rate: number | null; student: { guardian: Source } | null } | null;
}
export interface CostLessonIn {
  id: string;
  starts_at: string;
  ends_at: string;
  teacher: Rates | null;
  lesson_students: { student: { guardian: Source } | null }[];
}
export interface ExpenseIn {
  month: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
}

const sourceOf = (g: Source): SourceKey => g?.source ?? 'unknown';

export function paymentFacts(rows: readonly PaymentIn[]): PaymentFact[] {
  return rows.map((p) => {
    const fx = p.subscription?.fx_rate ? Number(p.subscription.fx_rate) : null;
    const quoted = fx !== null && p.currency !== 'SAR';
    return {
      amount: quoted ? Number(p.amount) / fx : Number(p.amount),
      currency: quoted ? 'SAR' : p.currency,
      month: riyadhMonth(p.paid_at),
      source: sourceOf(p.subscription?.student?.guardian ?? null),
    };
  });
}

/** lesson id → the rate per duration frozen in the approved/paid payout that counted it. */
export type FrozenRates = ReadonlyMap<string, Partial<Record<Duration, number>>>;

export function frozenRates(payouts: readonly { breakdown: Json }[]): FrozenRates {
  const out = new Map<string, Partial<Record<Duration, number>>>();
  for (const p of payouts) {
    const { lines, lesson_ids } = readBreakdown(p.breakdown);
    const rates: Partial<Record<Duration, number>> = Object.fromEntries(lines.map((l) => [l.duration, l.rate]));
    for (const id of lesson_ids) out.set(id, rates);
  }
  return out;
}

/** EGP cost of the lesson: its frozen payout rate, else the teacher's rate; null = no rate. */
export function lessonCostEgp(
  l: Pick<CostLessonIn, 'id' | 'starts_at' | 'ends_at' | 'teacher'>,
  frozen: FrozenRates = new Map(),
): number | null {
  const minutes = Math.round((Date.parse(l.ends_at) - Date.parse(l.starts_at)) / 60_000);
  const duration = DURATIONS.find((d) => d === minutes);
  if (duration === undefined) return null;
  const paid = frozen.get(l.id)?.[duration];
  if (paid !== undefined) return paid;
  return l.teacher ? l.teacher[`rate_${duration}`] : null;
}

/** Costed lessons, and how many could not be costed (shown as a warning, never guessed). */
export function costFacts(
  rows: readonly CostLessonIn[],
  frozen: FrozenRates = new Map(),
): { facts: CostFact[]; unrated: number } {
  const facts: CostFact[] = [];
  let unrated = 0;
  for (const l of rows) {
    const amount = lessonCostEgp(l, frozen);
    if (amount === null) {
      unrated += 1;
      continue;
    }
    const sources = l.lesson_students.map((s) => sourceOf(s.student?.guardian ?? null));
    facts.push({ amount, currency: 'EGP', month: riyadhMonth(l.starts_at), sources });
  }
  return { facts, unrated };
}

export function expenseFacts(rows: readonly ExpenseIn[]): ExpenseFact[] {
  return rows.map((e) => ({ amount: Number(e.amount), currency: e.currency, month: e.month.slice(0, 7), category: e.category }));
}

/** Every currency the facts are in (to read only the rates needed). */
export function currenciesOf(...lists: readonly (readonly { currency: string }[])[]): Set<string> {
  return new Set(lists.flatMap((l) => l.map((m) => m.currency)));
}
