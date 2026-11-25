import type { Tx } from '../core/rls';
import { pay, subscription } from '../sales/assistant';

// Helpers of the finance card SQL spec (migration 20261125000100): a student of a guardian with a
// given source on a lesson, a quoted package payment, an expense month, the function's rows.

interface CardRow {
  kind: string;
  month: string;
  currency: string;
  key: string;
  amount: number;
  n: number;
}

export async function studentOf(
  tx: Tx,
  input: { phone: string; source: string | null; lesson: string },
): Promise<string> {
  const [g] = await tx<
    { id: string }[]
  >`insert into public.guardians (name, phone_e164, country, tz, source)
    values ('ولي أمر البطاقة', ${input.phone}, 'SA', 'Asia/Riyadh', ${input.source}) returning id`;
  if (!g) throw new Error('guardian not written');
  const [s] = await tx<
    { id: string }[]
  >`insert into public.students (guardian_id, name, name_normalized, tz)
    values (${g.id}, 'طالب البطاقة', 'طالب البطاقه', 'Asia/Riyadh') returning id`;
  if (!s) throw new Error('student not written');
  await tx`insert into public.lesson_students (lesson_id, student_id) values (${input.lesson}, ${s.id})`;
  return s.id;
}

/** A package of `student` in `currency`, quoted at `fxRate` SAR→currency when given. */
export async function paidPackage(
  tx: Tx,
  input: { student: string; currency: string; fxRate: number | null },
): Promise<string> {
  const sub = await subscription(tx, input.student, { price: 100, currency: input.currency });
  await tx`update public.subscriptions set fx_rate = ${input.fxRate} where id = ${sub}`;
  return sub;
}

export const payAt = (
  tx: Tx,
  sub: string,
  input: { amount: number; at: string; refund?: boolean },
) =>
  pay(tx, sub, { amount: input.amount, at: input.at, kind: input.refund ? 'refund' : 'payment' });

export async function expense(tx: Tx, input: { month: string; amount: number; draft?: boolean }) {
  await tx`insert into public.expenses (month, category, amount, currency, is_draft)
    values (${input.month}, 'ads', ${input.amount}, 'EGP', ${input.draft ?? false})`;
}

export async function cardRows(
  tx: Tx,
  input: { from: string; to: string; month: string },
): Promise<CardRow[]> {
  return tx<CardRow[]>`select kind, month, currency, key, amount::float8 as amount, n::int as n
    from public.finance_card_totals(${input.from}, ${input.to}, ${input.month}, ${input.month})
    order by kind, key`;
}
