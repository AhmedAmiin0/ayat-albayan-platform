import { MIN } from './earnings';
import type { Tx } from './rls';

// Helpers of the pay-rule SQL specs (migrations 20261005000200–202): a lesson on a rule with a
// given package (trial or not), a student with a given status on it, a payout over lessons.

export async function ruleLesson(tx: Tx, input: { teacher: string; pkg: '4' | 'trial'; daysAgo: number }): Promise<string> {
  const start = Math.floor((Date.now() - input.daysAgo * 86_400_000) / 3_600_000) * 3_600_000;
  const day = new Date(start).toISOString().slice(0, 10);
  const [rule] = await tx<{ id: string }[]>`insert into public.schedule_rules
    (teacher_id, duration_min, start_time_local, tz, byday, starts_on, ends_on, package, meeting_link)
    values (${input.teacher}, '45', '10:00', 'Asia/Riyadh', '{1}', ${day}, ${day}, ${input.pkg}, 'https://meet.jit.si/x')
    returning id`;
  if (!rule) throw new Error('rule not written');
  const [l] = await tx<{ id: string }[]>`insert into public.lessons (rule_id, teacher_id, starts_at, ends_at, status)
    values (${rule.id}, ${input.teacher}, ${new Date(start).toISOString()},
            ${new Date(start + 45 * MIN).toISOString()}, 'completed') returning id`;
  if (!l) throw new Error('lesson not written');
  return l.id;
}

/** A student with `status` on the lesson; returns the student id. */
export async function studentOn(tx: Tx, input: { lesson: string; status: string }): Promise<string> {
  const [g] = await tx<{ id: string }[]>`insert into public.guardians (name, phone_e164, country, tz)
    values ('ولي أمر قاعدة الأجر', ${`+9665${String(Date.now()).slice(-8)}`}, 'SA', 'Asia/Riyadh') returning id`;
  if (!g) throw new Error('guardian not written');
  const [s] = await tx<{ id: string }[]>`insert into public.students (guardian_id, name, name_normalized, tz, status)
    values (${g.id}, 'طالب الأجر', 'طالب الاجر', 'Asia/Riyadh', ${input.status}) returning id`;
  if (!s) throw new Error('student not written');
  await tx`insert into public.lesson_students (lesson_id, student_id) values (${input.lesson}, ${s.id})`;
  return s.id;
}

export async function payableIds(tx: Tx, teacher: string): Promise<string[]> {
  const rows = await tx<{ lesson_id: string }[]>`select lesson_id from public.v_teacher_payable_lessons
    where teacher_id = ${teacher} order by starts_at`;
  return rows.map((r) => r.lesson_id);
}

export async function countableIds(tx: Tx, teacher: string): Promise<string[]> {
  const rows = await tx<{ lesson_id: string }[]>`select lesson_id from public.v_teacher_countable_earnings
    where teacher_id = ${teacher} order by starts_at`;
  return rows.map((r) => r.lesson_id);
}

export async function approvedPayout(tx: Tx, input: { teacher: string; lessons: string[]; amount: number }): Promise<string> {
  const [po] = await tx<{ id: string }[]>`insert into public.teacher_payouts
    (teacher_id, month, lessons_count, amount, status, approved_at, breakdown)
    values (${input.teacher}, '2031-05-01', ${input.lessons.length}, ${input.amount}, 'approved', now(),
            ${tx.json({ lesson_ids: input.lessons })}) returning id`;
  if (!po) throw new Error('payout not written');
  return po.id;
}

export const setSettingTx = (tx: Tx, key: string, on: boolean) =>
  tx`insert into public.settings (key, value) values (${key}, ${tx.json(on)})
     on conflict (key) do update set value = excluded.value`;
