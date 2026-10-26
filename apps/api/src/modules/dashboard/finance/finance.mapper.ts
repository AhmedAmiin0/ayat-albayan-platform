import type { LeadSource } from '@ab/shared';
import type { SourceKey } from '../dashboard.types';
import type { CostFact, ExpenseFact, PaymentFact } from './finance';
import { riyadhMonth } from '../range';

// DB rows → finance facts (pure). A lesson's cost is its ledger amount (EGP): the ONE pay rule of
// v_teacher_payable_lessons, the rate frozen when the lesson counted, the same amount the monthly
// payout and the per-session ledger pay (R-RPT-02, E3); no rate → "unrated", cost unknown.
// A payment of a package priced in USD is booked at the SAR rate of its quote (subscriptions
// fx_rate), so a closed month's revenue does not move with today's rate.

type Source = { source: LeadSource | null } | null;

export interface PaymentIn {
  amount: number;
  currency: string;
  paid_at: string;
  /** A refund («استرداد») is money back: negative revenue. Absent = a payment. */
  kind?: 'payment' | 'refund';
  subscription: { fx_rate: number | null; student: { guardian: Source } | null } | null;
}
export interface CostLessonIn {
  lesson_id: string;
  starts_at: string;
  amount: number | null;
}
export type LessonSourceIn = { lesson_id: string; student: { guardian: Source } | null };
export interface ExpenseIn {
  month: string;
  category: string;
  amount: number;
  currency: string;
}

const sourceOf = (g: Source): SourceKey => g?.source ?? 'unknown';

export function paymentFacts(rows: readonly PaymentIn[]): PaymentFact[] {
  return rows.map((p) => {
    const fx = p.subscription?.fx_rate ? Number(p.subscription.fx_rate) : null;
    const quoted = fx !== null && p.currency !== 'SAR';
    const signed = p.kind === 'refund' ? -Number(p.amount) : Number(p.amount);
    return {
      amount: quoted ? signed / fx : signed,
      currency: quoted ? 'SAR' : p.currency,
      month: riyadhMonth(p.paid_at),
      source: sourceOf(p.subscription?.student?.guardian ?? null),
    };
  });
}

/** Costed lessons, and how many could not be costed (shown as a warning, never guessed). */
export function costFacts(
  rows: readonly CostLessonIn[],
  students: readonly LessonSourceIn[] = [],
): { facts: CostFact[]; unrated: number } {
  const sources = new Map<string, SourceKey[]>();
  for (const s of students) sources.set(s.lesson_id, [...(sources.get(s.lesson_id) ?? []), sourceOf(s.student?.guardian ?? null)]);
  const facts: CostFact[] = [];
  let unrated = 0;
  for (const l of rows) {
    if (l.amount === null) unrated += 1;
    else facts.push({ amount: Number(l.amount), currency: 'EGP', month: riyadhMonth(l.starts_at), sources: sources.get(l.lesson_id) ?? [] });
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
