import type { Tx } from './rls';

// Helpers of the assistant (base role sales) SQL specs, migrations 270-274. Everything is written
// inside the spec's rolled-back transaction, as the owner role (the triggers run as in production).

/** 'ok', the raise exception text of a P0001 (the API's error code), else the SQLSTATE. */
export const code = (tx: Tx, q: () => Promise<unknown>) =>
  tx.savepoint(q).then(() => 'ok', (e: { code?: string; message?: string }) => (e.code === 'P0001' ? e.message : e.code));

/** A sales login (auth user + profile, tz Riyadh) with the given terms (null = none). */
export async function assistant(tx: Tx, tag: string, terms?: Record<string, string | number | null>): Promise<string> {
  const [u] = await tx<{ id: string }[]>`insert into auth.users (id, email)
    values (gen_random_uuid(), ${`${tag}@e2e.local`}) returning id`;
  if (!u) throw new Error('auth user not written');
  await tx`insert into public.profiles (id, role, full_name) values (${u.id}, 'sales', ${`مسؤول مبيعات ${tag}`})`;
  if (terms) {
    const t = { commission_type: null, commission_value: null, commission_currency: null, commission_starts_on: null,
      salary_amount: null, salary_currency: null, salary_starts_on: null, ...terms };
    await tx`insert into public.assistant_terms (assistant_id, commission_type, commission_value, commission_currency,
        commission_starts_on, salary_amount, salary_currency, salary_starts_on)
      values (${u.id}, ${t.commission_type}, ${t.commission_value}, ${t.commission_currency},
        ${t.commission_starts_on}, ${t.salary_amount}, ${t.salary_currency}, ${t.salary_starts_on})`;
  }
  return u.id;
}

/** A guardian with one child; broughtBy = the sales profile (null: nobody brought them), broughtAt = when (default now). */
export async function student(tx: Tx, input: { phone: string; broughtBy?: string | null; broughtAt?: string }): Promise<string> {
  const [g] = await tx<{ id: string }[]>`insert into public.guardians (name, phone_e164, country, tz)
    values ('ولي أمر', ${input.phone}, 'SA', 'Asia/Riyadh') returning id`;
  if (!g) throw new Error('guardian not written');
  const [s] = await tx<{ id: string }[]>`insert into public.students (guardian_id, name, name_normalized, tz, brought_by, brought_at)
    values (${g.id}, 'طالب', 'طالب', 'Asia/Riyadh', ${input.broughtBy ?? null}, ${input.broughtAt ?? null}) returning id`;
  if (!s) throw new Error('student not written');
  return s.id;
}

export async function subscription(tx: Tx, studentId: string, input: { price: number; currency?: string }): Promise<string> {
  const [s] = await tx<{ id: string }[]>`insert into public.subscriptions
    (student_id, package, duration, lessons_total, price, currency, price_source, starts_on)
    values (${studentId}, '8', 30, 8, ${input.price}, ${input.currency ?? 'SAR'}, '{}'::jsonb, current_date)
    returning id`;
  if (!s) throw new Error('subscription not written');
  return s.id;
}

type PayOpts = { amount: number; kind?: 'payment' | 'refund'; at?: string; by?: string };

/** A payment (or refund) of the package, in the package currency: a bare number is a payment of now. */
export async function pay(tx: Tx, sub: string, p: number | PayOpts) {
  const o: PayOpts = typeof p === 'number' ? { amount: p } : p;
  const [row] = await tx<{ id: string }[]>`insert into public.payments
    (subscription_id, amount, currency, method, paid_at, kind, recorded_by)
    values (${sub}, ${o.amount}, (select currency from public.subscriptions where id = ${sub}), 'bank',
      ${o.at ?? new Date().toISOString()}, ${o.kind ?? 'payment'}, ${o.by ?? null}) returning id`;
  return row?.id;
}

/** First row or a loud failure: keeps the specs free of non-null assertions. */
export function one<T>(rows: readonly T[]): T {
  const [row] = rows;
  if (row === undefined) throw new Error('expected a row');
  return row;
}

export type CommissionRow = { assistant_id: string; amount: string; currency: string; status: string; subscription_id: string | null; statement_id: string | null };

export const commissionOf = async (tx: Tx, studentId: string): Promise<CommissionRow | undefined> =>
  (await tx<CommissionRow[]>`select assistant_id, amount::text, currency, status, subscription_id, statement_id
    from public.assistant_commissions where student_id = ${studentId}`)[0];

/** A one-student family: brought by `by` (at `broughtAt`, default now), one package of `price`, nothing paid yet. */
export async function brought(tx: Tx, input: { by: string; phone: string; price: number; currency?: string; broughtAt?: string }) {
  const st = await student(tx, { phone: input.phone, broughtBy: input.by, ...(input.broughtAt ? { broughtAt: input.broughtAt } : {}) });
  return { student: st, sub: await subscription(tx, st, input) };
}

/** The first day (YYYY-MM-DD) of the month the next statement of `a` falls in: this month in Riyadh. */
export const openMonth = async (tx: Tx, a: string): Promise<string> =>
  one(await tx<{ m: string }[]>`select public.assistant_next_open_month(${a})::text as m`).m;

/** The first day of last month in Riyadh: a statement a payment made 35 days ago belongs in. */
export const lastMonth = async (tx: Tx): Promise<string> =>
  one(await tx<{ m: string }[]>`select (date_trunc('month', now() at time zone 'Asia/Riyadh') - interval '1 month')::date::text as m`).m;

/** Today in the academy's zone (Asia/Riyadh) plus `offset` days, YYYY-MM-DD. */
export const riyadhDay = async (tx: Tx, offset: number): Promise<string> =>
  one(await tx<{ d: string }[]>`select ((now() at time zone 'Asia/Riyadh')::date + ${offset}::int)::text as d`).d;

/** Builds the draft of `month` for `a`: its id and totals. */
export const generate = async (tx: Tx, a: string, month: string) =>
  one(await tx<{ r: { statement_id: string; totals: Record<string, Record<string, number>> } }[]>`select
    public.generate_assistant_statement(${a}, ${month}, null) as r`).r;

/** Generates, approves and pays the statement of `month`; returns its id. */
export async function paidStatement(tx: Tx, a: string, month: string): Promise<string> {
  const { statement_id: id } = await generate(tx, a, month);
  await tx`select public.approve_assistant_statement(${id}, null)`;
  await tx`select public.pay_assistant_statement(${id}, null, '{}')`;
  return id;
}

export const iso = (daysFromNow: number) => new Date(Date.now() + daysFromNow * 86_400_000).toISOString();
export const today = () => new Date().toISOString().slice(0, 10);
