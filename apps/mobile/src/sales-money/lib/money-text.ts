import {
  formatAmount,
  type AssistantStatementLineView,
  type AssistantStatementView,
  type AssistantTermsView,
  type MyCommissionRow,
  type PaymentMethod,
} from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { currencyName, localDay, instantDay, money } from '@/payments/format';
import { monthLabel } from '@/teacher/lib/payout-text';
import { isolate, ltr } from '@/core/ui/primitives/Ltr';

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

/**
 * «تُحسب العمولة كاملة … ولك 50% منها عن كل تجديد … اعتبارًا من …» (owner 2026-10-26: renewals earn a share);
 * share 0 (owner 2026-11-01: «عمولة التجديد» off): «… عمولة التجديد موقوفة حاليًا».
 */
export const commissionNote = (startsOn: string, renewalShare: number | undefined): string =>
  (renewalShare ? p.commissionNote : p.commissionNoteRenewalOff).replace('{n}', String(renewalShare ?? '')).replace('{date}', localDay(startsOn));

/** One line of a statement: «الراتب», «عمولة يوسف», «عمولة تجديد يوسف», «تسوية: سبب». */
export function lineText(l: AssistantStatementLineView): string {
  if (l.kind === 'salary') return p.line.salary;
  if (l.kind === 'commission') {
    const text = l.commission_kind === 'renewal' ? p.line.commissionRenewal : p.line.commission;
    return text.replace('{student}', l.student?.name ?? '');
  }
  return p.line.adjustment.replace('{reason}', l.reason ? isolate(l.reason) : '');
}

/** «دُفع 3 نوفمبر 2026» / «اعتُمد …», or null for a draft. */
export function statementWhen(s: Pick<AssistantStatementView, 'paid_at' | 'approved_at'>, tz: string): string | null {
  if (s.paid_at) return p.paidAt.replace('{date}', instantDay(s.paid_at, tz));
  return s.approved_at ? p.approvedAt.replace('{date}', instantDay(s.approved_at, tz)) : null;
}

/** Entries of a per-currency record, sorted by currency (never one number across them). */
export const byCurrency = <V>(totals: Readonly<Record<string, V>>): [string, V][] =>
  Object.entries(totals).sort(([a], [b]) => a.localeCompare(b));

// «محفظتي» (owner 2026-10-29): one commission entry in two lines.

const W = t.assistantPortal.wallet;

/** «‎+50‎ ج.م» with `plus` (the sign inside the number's isolate, so RTL keeps it before the digits), else «50 ج.م». */
export const walletMoney = (amount: number, currency: string, plus = false): string =>
  `${ltr(`${plus ? '+' : ''}${formatAmount(amount)}`)} ${currencyName(currency)}`;

/** The wallet's short words for line 2 at 360dp («دفع إلكتروني», «تحويل بنكي»); the other methods' own words are short. */
const SHORT_METHOD: Partial<Record<PaymentMethod, string>> = W.method;

/** «AB-1022 · lmkl · أول اشتراك · دفع إلكتروني»; a voided one ends with why, in short, instead. The day is on line 1. */
export function commissionLine(c: MyCommissionRow): string {
  const who = [ltr(c.student.code), isolate(c.student.name)];
  if (c.state === 'voided') return [...who, c.void_reason ? W.voided[c.void_reason] : W.voidedByAdmin].join(' · ');
  const kind = c.kind === 'renewal' ? t.assistants.ledger.kind.renewal.replace('{n}', String(c.share_percent)) : t.assistants.ledger.kind.first;
  return [...who, kind, ...(c.method ? [SHORT_METHOD[c.method] ?? t.enums.paymentMethod[c.method]] : [])].join(' · ');
}

/** «29 أكتوبر 2026»: the day it was earned, on the entry's first line. */
export const commissionDay = (c: Pick<MyCommissionRow, 'earned_at'>, tz: string): string =>
  instantDay(c.earned_at, tz);

/** The chip: «مستحقة», «في كشف أكتوبر 2026», «مدفوعة» or «ملغاة». */
export function walletStateText(c: Pick<MyCommissionRow, 'state' | 'statement_month'>): string {
  if (c.state === 'paid') return W.state.paid;
  if (c.state === 'voided') return t.assistantPortal.commission.voided;
  if (c.state === 'in_statement' && c.statement_month) return W.state.in_statement.replace('{month}', monthLabel(c.statement_month.slice(0, 7)));
  return t.assistantPortal.commission.earned;
}
