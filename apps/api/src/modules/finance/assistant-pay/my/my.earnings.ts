import {
  monthOf,
  planStatement,
  sumByCurrency,
  walletTotals,
  type AssistantStatementView,
  type AssistantTermsView,
  type MyEarnings,
  type WalletLine,
} from '@ab/shared';
import type { StatementRow } from '@/modules/finance/assistant-pay/statements/statements.mapper';
import type { MyAdjustment, MyCommission, StatementState } from './my.queries';

const frozen = (r: StatementState): boolean => r.statement?.status === 'approved' || r.statement?.status === 'paid';

/**
 * The commission money my approved and paid statements hold, as they froze it: their commission lines and
 * their reversal lines (assistant_statement_lines). Never the commission rows: a re-earn sets a row's
 * statement to null and a merge deletes it, while the frozen statement still pays (or paid) that line.
 */
export function frozenLines(statements: readonly Pick<StatementRow, 'status' | 'lines'>[]): WalletLine[] {
  return statements.flatMap(({ status, lines }) =>
    status === 'draft'
      ? []
      : lines
          .filter((l) => l.kind === 'commission' || l.adjustment?.kind === 'reversal')
          .map((l) => ({ amount: Number(l.amount), currency: l.currency, statement: { status } })),
  );
}

/**
 * «محفظتي»'s lines: the frozen statements' lines, then what no frozen statement holds yet: the earned
 * commissions (no statement or a draft) and the reversals (negative). A voided commission is never a row
 * here: inside a frozen statement its line counts, in a draft (a reopened one too) nothing does. The admin's
 * other adjustments (bonus, deduction) are statement matters, not commissions.
 */
function walletLines(i: { frozen: readonly WalletLine[]; commissions: readonly MyCommission[]; adjustments: readonly MyAdjustment[] }): WalletLine[] {
  const open = (r: StatementState & { amount: number; currency: string }) => ({ amount: r.amount, currency: r.currency, statement: r.statement });
  return [
    ...i.frozen,
    ...i.commissions.filter((c) => !frozen(c)).map(open),
    ...i.adjustments.filter((a) => a.kind === 'reversal' && !frozen(a)).map(open),
  ];
}

/**
 * The assistant's own money page: the terms (read-only), what this month's statement would hold so far
 * (the frozen statement's totals once the month has one, else planStatement over what no frozen
 * statement holds yet), all earned commissions, «محفظتي» (walletTotals) and the statements already approved or paid.
 */
export function buildEarnings(i: {
  now: string;
  tz: string;
  terms: AssistantTermsView | null;
  commissions: readonly MyCommission[];
  adjustments: readonly MyAdjustment[];
  /** frozenLines of the approved and paid statements. */
  frozen: readonly WalletLine[];
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
    commissions_total: sumByCurrency(i.commissions),
    wallet: walletTotals(walletLines(i), i.commissions, { month, tz: i.tz }),
    statements: [...i.statements],
  };
}
