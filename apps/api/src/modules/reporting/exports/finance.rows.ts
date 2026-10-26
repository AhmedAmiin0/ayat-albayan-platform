import type { PaymentMethod, ReceivableRow } from '@ab/shared';
import { ar } from '../../../common/i18n/server-text';
import { riyadhStamp, safeText, type Cell } from './csv';

// Finance CSV rows (owner, 2026-10-05): expenses, the teacher ledger, receivables. Money as numbers.

const { expenses: E, earnings: L, payments: P, finance: F, students: S } = ar;
const method = (m: PaymentMethod | null) => (m ? ar.enums.paymentMethod[m] : '');
const seeded = ar.enums.expenseCategory as Record<string, string>;

export interface ExpenseIn {
  month: string;
  paid_on: string | null;
  category: string;
  amount: number;
  currency: string;
  vendor: string | null;
  method: PaymentMethod | null;
  note: string | null;
  recurring: boolean;
  is_draft: boolean;
  cat: { label_ar: string } | null;
}

export function expenseCsv(rows: readonly ExpenseIn[]): Cell[][] {
  const head: Cell[] = [E.month, F.paidOn, E.category, E.amount, E.currency, F.vendor, P.method, F.recurring, F.draft, E.note];
  return [
    head,
    ...rows.map((e): Cell[] => [
      e.month.slice(0, 7),
      e.paid_on ?? '',
      e.cat?.label_ar ?? seeded[e.category] ?? e.category,
      Number(e.amount),
      e.currency,
      safeText(e.vendor),
      method(e.method),
      e.recurring ? F.yes : '',
      e.is_draft ? F.yes : '',
      safeText(e.note),
    ]),
  ];
}

type Named = { teacher: { display_name_ar: string } | null };
export type SessionIn = Named & { starts_at: string; minutes: number; amount: number; paid_amount: number; status: string };
export type TeacherPayIn = Named & {
  paid_at: string;
  amount: number;
  method: PaymentMethod;
  note: string | null;
  payout_id: string | null;
  voided_at: string | null;
  void_reason: string | null;
};

/** Two blocks in one file: the month's sessions, then the payments made to the teacher(s). */
export function ledgerCsv(input: { sessions: readonly SessionIn[]; payments: readonly TeacherPayIn[] }): Cell[][] {
  const status = L.statusName as Record<string, string>;
  return [
    [F.ledgerSessions],
    [ar.payouts.teacher, L.date, L.duration, L.amount, L.paidAmount, L.left, L.status],
    ...input.sessions.map((s): Cell[] => [
      safeText(s.teacher?.display_name_ar),
      riyadhStamp(s.starts_at),
      s.minutes,
      Number(s.amount),
      Number(s.paid_amount),
      Math.round((Number(s.amount) - Number(s.paid_amount)) * 100) / 100,
      status[s.status] ?? s.status,
    ]),
    [],
    [F.ledgerPayments],
    [ar.payouts.teacher, P.paidAt, P.amount, P.method, L.fromPayout, F.voidedColumn, P.note],
    ...input.payments.map((p): Cell[] => [
      safeText(p.teacher?.display_name_ar),
      riyadhStamp(p.paid_at),
      p.voided_at ? 0 : Number(p.amount),
      method(p.method),
      p.payout_id ? F.yes : '',
      p.voided_at ? F.voided.replace('{reason}', safeText(p.void_reason)) : '',
      safeText(p.note),
    ]),
  ];
}

export function receivablesCsv(rows: readonly ReceivableRow[]): Cell[][] {
  const bucket = F.aging as Record<string, string>;
  return [
    [S.code, S.name, F.guardian, F.phone, F.packageFrom, F.price, F.paid, F.owed, P.currency, F.daysOverdue, F.agingBucket],
    ...rows.map((r): Cell[] => [
      r.student.code,
      safeText(r.student.name),
      safeText(r.guardian?.name),
      r.guardian?.phone_e164 ?? '',
      r.starts_on,
      Number(r.price),
      r.paid,
      r.owed,
      r.currency,
      r.days_overdue,
      bucket[r.bucket] ?? r.bucket,
    ]),
  ];
}
