import { fromCents, monthOf, planStatement, toCents, type AssistantStatementView, type AssistantTermsView, type MyEarnings } from '@ab/shared';
import type { MyAdjustment, MyCommission, StatementState } from './my.queries';

const frozen = (r: StatementState): boolean => r.statement?.status === 'approved' || r.statement?.status === 'paid';

/** Earned commissions per currency, in exact cents (never summed across currencies). */
export function commissionsTotal(commissions: readonly Pick<MyCommission, 'amount' | 'currency'>[]): Record<string, number> {
  const cents: Record<string, number> = {};
  for (const c of commissions) cents[c.currency] = (cents[c.currency] ?? 0) + toCents(c.amount);
  return Object.fromEntries(Object.entries(cents).map(([currency, v]) => [currency, fromCents(v)]));
}

/**
 * The assistant's own money page: the terms (read-only), what this month's statement would hold so far
 * (the frozen statement's totals once the month has one, else planStatement over what no frozen
 * statement holds yet), all earned commissions and the statements already approved or paid.
 */
export function buildEarnings(i: {
  now: string;
  tz: string;
  terms: AssistantTermsView | null;
  commissions: readonly MyCommission[];
  adjustments: readonly MyAdjustment[];
  /** Approved and paid only: a draft is the admin's to change. */
  statements: readonly AssistantStatementView[];
}): MyEarnings {
  const month = monthOf(i.now, i.tz);
  const issued = i.statements.find((s) => s.month === month);
  const salary = i.terms?.salary;
  const plan = planStatement({
    month,
    tz: i.tz,
    salary: salary ? { amount: salary.amount, currency: salary.currency, startsOn: salary.starts_on } : null,
    commissions: i.commissions.filter((c) => !frozen(c)).map((c) => ({ id: c.id, amount: c.amount, currency: c.currency, earnedAt: c.earned_at })),
    adjustments: i.adjustments.filter((a) => !frozen(a)).map((a) => ({ id: a.id, amount: a.amount, currency: a.currency, effectiveMonth: a.effective_month })),
  });
  return {
    terms: i.terms,
    this_month: issued ? issued.totals : plan.totals,
    commissions_total: commissionsTotal(i.commissions),
    statements: [...i.statements],
  };
}
