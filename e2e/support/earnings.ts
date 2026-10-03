import type { Tx } from './rls';

// Helpers for the teacher-earnings SQL specs (migrations 176–179): rows written as the owner role
// inside a rolled-back transaction, the way the API's RPC payloads look.

export type { Tx };
const DAY = 24 * 3600_000;
export const at = (days: number) => new Date(Date.UTC(2026, 8, 1) + days * DAY).toISOString();
export type Earning = { id: string; minutes: number; rate: string; amount: string; status: string };

/** A teacher with rates 30/45/60/90 = 50/70/90/120 and one lesson per call, `days` after 1 Sep 2026. */
export async function teacher(tx: Tx, profile?: string): Promise<string> {
  const [t] = await tx<{ id: string }[]>`insert into public.teachers
    (display_name_ar, gender, programs, tz, rate_30, rate_45, rate_60, rate_90, profile_id)
    values ('معلمة أرباح', 'female', '{quran}', 'Africa/Cairo', 50, 70, 90, 120, ${profile ?? null}) returning id`;
  if (!t) throw new Error('teacher not written');
  return t.id;
}
export async function lesson(tx: Tx, input: { teacher: string; days: number; minutes: number; status?: string }): Promise<string> {
  const start = at(input.days);
  const end = new Date(Date.parse(start) + input.minutes * 60_000).toISOString();
  const [l] = await tx<{ id: string }[]>`insert into public.lessons (teacher_id, starts_at, ends_at, status)
    values (${input.teacher}, ${start}, ${end}, ${input.status ?? 'scheduled'}) returning id`;
  if (!l) throw new Error('lesson not written');
  return l.id;
}
export const earningOf = async (tx: Tx, lessonId: string) =>
  (await tx<Earning[]>`select id, minutes, rate, amount, status from public.teacher_session_earnings where lesson_id = ${lessonId}`)[0];
export const pay = (tx: Tx, p: object) => tx`select public.record_teacher_payment(${tx.json(p as never)}) as r`;

