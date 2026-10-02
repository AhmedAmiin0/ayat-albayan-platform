import { DURATIONS, type ExpenseCategory, type LeadSource } from '@ab/shared';
import type { SourceKey } from './dashboard.types';
import type { CostFact, ExpenseFact, PaymentFact } from './finance';
import { riyadhMonth } from './range';

// DB rows → finance facts (pure). A lesson's cost is the teacher's rate for its duration (EGP,
// teachers.rate_30/45/60/90, same as payoutFor); no rate → the lesson is "unrated", cost unknown.

type Source = { source: LeadSource | null } | null;
type Rates = { rate_30: number | null; rate_45: number | null; rate_60: number | null; rate_90: number | null };

export interface PaymentIn {
  amount: number;
  currency: string;
  paid_at: string;
  subscription: { student: { guardian: Source } | null } | null;
}
export interface CostLessonIn {
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
  return rows.map((p) => ({
    amount: Number(p.amount),
    currency: p.currency,
    month: riyadhMonth(p.paid_at),
    source: sourceOf(p.subscription?.student?.guardian ?? null),
  }));
}

/** Teacher's EGP rate for the lesson's length; null = not a catalog duration or no rate set. */
export function lessonCostEgp(l: Pick<CostLessonIn, 'starts_at' | 'ends_at' | 'teacher'>): number | null {
  const minutes = Math.round((Date.parse(l.ends_at) - Date.parse(l.starts_at)) / 60_000);
  const duration = DURATIONS.find((d) => d === minutes);
  if (duration === undefined || !l.teacher) return null;
  return l.teacher[`rate_${duration}`];
}

/** Costed lessons, and how many could not be costed (shown as a warning, never guessed). */
export function costFacts(rows: readonly CostLessonIn[]): { facts: CostFact[]; unrated: number } {
  const facts: CostFact[] = [];
  let unrated = 0;
  for (const l of rows) {
    const amount = lessonCostEgp(l);
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
