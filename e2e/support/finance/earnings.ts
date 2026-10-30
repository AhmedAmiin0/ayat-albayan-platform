import type { Tx } from '../core/rls';
import { userId } from '../core/rls';
import { USERS } from '../core/users';

// Helpers of the teacher-earnings SQL specs (migrations 176-179): the e2e teacher with known
// rates, a past lesson of a given length and status, a payment through record_teacher_payment.

export const MIN = 60_000;

export async function teacherWithRates(tx: Tx): Promise<{ id: string; userId: string }> {
  const uid = await userId(tx, USERS.teacher.email);
  const [t] = await tx<{ id: string }[]>`update public.teachers
    set rate_30 = 50, rate_45 = 70, rate_60 = 90, rate_90 = null where profile_id = ${uid} returning id`;
  if (!t) throw new Error('e2e teacher missing (global setup)');
  return { id: t.id, userId: uid };
}

/** A lesson `daysAgo` days back (start at a whole hour), already in `status`. */
export async function pastLesson(tx: Tx, input: { teacher: string; minutes: number; status: string; daysAgo: number }) {
  const start = Math.floor((Date.now() - input.daysAgo * 86_400_000) / 3_600_000) * 3_600_000;
  const [l] = await tx<{ id: string }[]>`insert into public.lessons (teacher_id, starts_at, ends_at, status)
    values (${input.teacher}, ${new Date(start).toISOString()},
            ${new Date(start + input.minutes * MIN).toISOString()}, ${input.status}) returning id`;
  if (!l) throw new Error('lesson not written');
  return l.id;
}

export type EarningRow = {
  minutes: number;
  rate: string;
  amount: string;
  paid_amount: string;
  status: string;
};

export const earningOf = async (tx: Tx, lesson: string): Promise<EarningRow | undefined> => {
  const [e] = await tx<EarningRow[]>`select minutes, rate, amount, paid_amount, status
    from public.teacher_session_earnings where lesson_id = ${lesson}`;
  return e;
};

export async function pay(tx: Tx, input: { teacher: string; amount: number; items: { earning_id: string; amount: number }[]; request?: string }) {
  const p = {
    actor: null,
    teacher_id: input.teacher,
    client_request_id: input.request ?? null,
    amount: input.amount,
    method: 'cash',
    paid_at: new Date().toISOString(),
    items: input.items,
  };
  const [r] = await tx<{ r: { payment_id: string; replayed: boolean } }[]>`select public.record_teacher_payment(${tx.json(p)}) as r`;
  return r?.r;
}

export async function earningId(tx: Tx, lesson: string): Promise<string> {
  const [e] = await tx<{ id: string }[]>`select id from public.teacher_session_earnings where lesson_id = ${lesson}`;
  if (!e) throw new Error('no earning');
  return e.id;
}
