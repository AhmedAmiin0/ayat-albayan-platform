import { formatAmount, type AssistantStatementLineView, type AssistantStatementView, type AssistantTermsView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { localDay, instantDay, money } from '@/payments/format';
import { monthLabel } from '@/teacher/payout-text';

// The words of the salesperson's money (web EarningsTerms, StatementCard, terms-summary). Pure.

const p = t.assistantPortal.earnings;

/** «أكتوبر 2026» of a statement's YYYY-MM-01 month. */
export const statementMonth = (s: Pick<AssistantStatementView, 'month'>): string => monthLabel(s.month.slice(0, 7));

/** «3000 ج.م شهريًا، اعتبارًا من 1 أكتوبر 2026». */
export const salaryFrom = (salary: NonNullable<AssistantTermsView['salary']>): string =>
  p.salaryFrom.replace('{amount}', money(salary.amount, salary.currency)).replace('{date}', localDay(salary.starts_on));

/** My commission as the portal words it: «10% من سعر الاشتراك» / «50 ج.م عن كل طالب». */
export function myCommissionText(c: NonNullable<AssistantTermsView['commission']>): string {
  return c.type === 'percent'
    ? p.commissionPercent.replace('{value}', String(c.value))
    : p.commissionFixed.replace('{amount}', money(c.value, c.currency ?? ''));
}

/** The admin's words (web terms-summary): «70% من سعر الاشتراك», or «غير محددة». */
export function commissionText(c: AssistantTermsView['commission']): string {
  if (!c) return t.assistants.notSet;
  return c.type === 'percent'
    ? t.assistants.commissionPercent.replace('{value}', formatAmount(c.value))
    : t.assistants.commissionFixed.replace('{amount}', money(c.value, c.currency ?? ''));
}

/** «3000 ج.م», or «غير محددة». */
export const salaryText = (s: AssistantTermsView['salary']): string => (s ? money(s.amount, s.currency) : t.assistants.notSet);

/** «ابتداءً من 1 أكتوبر 2026» under a term, or null when it is not set. */
export const sinceText = (day: string | undefined): string | null => (day ? t.assistants.startsOn.replace('{date}', localDay(day)) : null);

/** One line of a statement: «الراتب», «عمولة يوسف», «تسوية: سبب». */
export function lineText(l: AssistantStatementLineView): string {
  if (l.kind === 'salary') return p.line.salary;
  if (l.kind === 'commission') return p.line.commission.replace('{student}', l.student?.name ?? '');
  return p.line.adjustment.replace('{reason}', l.reason ?? '');
}

/** «دُفع 3 نوفمبر 2026» / «اعتُمد …», or null for a draft. */
export function statementWhen(s: Pick<AssistantStatementView, 'paid_at' | 'approved_at'>): string | null {
  if (s.paid_at) return p.paidAt.replace('{date}', instantDay(s.paid_at));
  return s.approved_at ? p.approvedAt.replace('{date}', instantDay(s.approved_at)) : null;
}

/** Entries of a per-currency record, sorted by currency (never one number across them). */
export const byCurrency = <V>(totals: Readonly<Record<string, V>>): [string, V][] =>
  Object.entries(totals).sort(([a], [b]) => a.localeCompare(b));
