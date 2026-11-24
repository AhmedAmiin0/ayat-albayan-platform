import {
  formatAmount,
  type AssistantStatementLineView,
  type AssistantStatementView,
  type AssistantTermsView,
  type MyCommissionRow,
  type PaymentMethod,
} from '@ab/shared';
import { t, isolate, ltr, currencyName, money } from '@ab/mobile-kit';
import { localDay, instantDay } from '@/core/lib/money/format';
import { monthLabel } from '@/teacher/lib/payout-text';

// The words of the salesperson's money (web EarningsTerms, StatementCard, terms-summary). Pure.

const p = t.assistantPortal.earnings;

export const statementMonth = (s: Pick<AssistantStatementView, 'month'>): string => monthLabel(s.month.slice(0, 7));

export const salaryFrom = (salary: NonNullable<AssistantTermsView['salary']>): string =>
  p.salaryFrom.replace('{amount}', money(salary.amount, salary.currency)).replace('{date}', localDay(salary.starts_on));

export function myCommissionText(c: NonNullable<AssistantTermsView['commission']>): string {
  return c.type === 'percent'
    ? p.commissionPercent.replace('{value}', String(c.value))
    : p.commissionFixed.replace('{amount}', money(c.value, c.currency ?? ''));
}

export function commissionText(c: AssistantTermsView['commission']): string {
  if (!c) return t.assistants.notSet;
  return c.type === 'percent'
    ? t.assistants.commissionPercent.replace('{value}', formatAmount(c.value))
    : t.assistants.commissionFixed.replace('{amount}', money(c.value, c.currency ?? ''));
}

export const salaryText = (s: AssistantTermsView['salary']): string => (s ? money(s.amount, s.currency) : t.assistants.notSet);

/** Null when the term has no start. */
export const sinceText = (day: string | undefined): string | null => (day ? t.assistants.startsOn.replace('{date}', localDay(day)) : null);

/** Renewals earn a share of the commission; a share of 0 means renewal commission is off. */
export const commissionNote = (startsOn: string, renewalShare: number | undefined): string =>
  (renewalShare ? p.commissionNote : p.commissionNoteRenewalOff).replace('{n}', String(renewalShare ?? '')).replace('{date}', localDay(startsOn));

export function lineText(l: AssistantStatementLineView): string {
  if (l.kind === 'salary') return p.line.salary;
  if (l.kind === 'commission') {
    const text = l.commission_kind === 'renewal' ? p.line.commissionRenewal : p.line.commission;
    return text.replace('{student}', l.student?.name ?? '');
  }
  return p.line.adjustment.replace('{reason}', l.reason ? isolate(l.reason) : '');
}

/** Null for a draft. */
export function statementWhen(s: Pick<AssistantStatementView, 'paid_at' | 'approved_at'>, tz: string): string | null {
  if (s.paid_at) return p.paidAt.replace('{date}', instantDay(s.paid_at, tz));
  return s.approved_at ? p.approvedAt.replace('{date}', instantDay(s.approved_at, tz)) : null;
}

/** Entries of a per-currency record, sorted by currency (never one number across them). */
export const byCurrency = <V>(totals: Readonly<Record<string, V>>): [string, V][] =>
  Object.entries(totals).sort(([a], [b]) => a.localeCompare(b));

const W = t.assistantPortal.wallet;

/** The plus sign sits inside the number's isolate so RTL keeps it before the digits. */
export const walletMoney = (amount: number, currency: string, plus = false): string =>
  `${ltr(`${plus ? '+' : ''}${formatAmount(amount)}`)} ${currencyName(currency)}`;

/** Short method words so line 2 fits 360dp. */
const SHORT_METHOD: Partial<Record<PaymentMethod, string>> = W.method;

/** A voided entry ends with why; the day sits on line 1. */
export function commissionLine(c: MyCommissionRow): string {
  const who = [ltr(c.student.code), isolate(c.student.name)];
  if (c.state === 'voided') return [...who, c.void_reason ? W.voided[c.void_reason] : W.voidedByAdmin].join(' · ');
  const kind = c.kind === 'renewal' ? t.assistants.ledger.kind.renewal.replace('{n}', String(c.share_percent)) : t.assistants.ledger.kind.first;
  return [...who, kind, ...(c.method ? [SHORT_METHOD[c.method] ?? t.enums.paymentMethod[c.method]] : [])].join(' · ');
}

export const commissionDay = (c: Pick<MyCommissionRow, 'earned_at'>, tz: string): string =>
  instantDay(c.earned_at, tz);

export function walletStateText(c: Pick<MyCommissionRow, 'state' | 'statement_month'>): string {
  if (c.state === 'paid') return W.state.paid;
  if (c.state === 'voided') return t.assistantPortal.commission.voided;
  if (c.state === 'in_statement' && c.statement_month) return W.state.in_statement.replace('{month}', monthLabel(c.statement_month.slice(0, 7)));
  return t.assistantPortal.commission.earned;
}
