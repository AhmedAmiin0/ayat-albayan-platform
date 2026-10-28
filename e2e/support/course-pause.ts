import type { Tx } from './edit-time';
import { USERS } from './users';

// Helpers of e2e/tests/course-pause.sql.spec.ts: the course pause RPCs (migrations 955–957, docs/11 §7b) against
// the real database inside a transaction that is rolled back. Days are Riyadh days relative to the tx's now().

type PauseSeed = {
  today: string;
  actor: string;
  student: string;
  other: string;
  sub: string;
  solo: string;
  group: string;
};

const phone = () => `+9665${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;

/** Riyadh `today + n` days, 17:00 Riyadh (14:00Z): one solo lesson per day. */
const at = (today: string, n: number, hourZ = 14) =>
  new Date(Date.parse(`${today}T00:00:00Z`) + n * 86_400_000 + hourZ * 3_600_000).toISOString();

async function student(tx: Tx, name: string): Promise<string> {
  const [g] = await tx<{ id: string }[]>`insert into public.guardians (name, phone_e164, country, tz)
    values ('ولي أمر الإيقاف', ${phone()}, 'SA', 'Asia/Riyadh') returning id`;
  const [s] = await tx<{ id: string }[]>`insert into public.students (guardian_id, name, name_normalized, tz, status)
    values (${g?.id ?? ''}, ${name}, ${name}, 'Asia/Riyadh', 'active') returning id`;
  if (!s) throw new Error('student not written');
  return s.id;
}

async function rule(tx: Tx, o: { teacher: string; today: string; students: string[]; sub: string | null }): Promise<string> {
  const [r] = await tx<{ id: string }[]>`insert into public.schedule_rules
    (teacher_id, duration_min, start_time_local, tz, byday, starts_on, ends_on, subscription_id)
    values (${o.teacher}, 45, '17:00', 'Asia/Riyadh', '{0,1,2,3,4,5,6}', ${o.today}, (${o.today}::date + 30), ${o.sub}) returning id`;
  if (!r) throw new Error('rule not written');
  for (const s of o.students) await tx`insert into public.schedule_rule_students (rule_id, student_id) values (${r.id}, ${s})`;
  return r.id;
}

/** generate_rule_lessons for `days` (Riyadh today + n) at `hourZ`; returns the new lesson ids. */
export async function generate(tx: Tx, o: { rule: string; today: string; days: number[]; hourZ?: number }): Promise<string[]> {
  const rows = o.days.map((n) => ({ starts_at: at(o.today, n, o.hourZ), ends_at: new Date(Date.parse(at(o.today, n, o.hourZ)) + 45 * 60_000).toISOString(), meeting_link: null }));
  const out = await tx<{ id: string }[]>`select id from public.generate_rule_lessons(${o.rule}, ${tx.json(rows)}, null)`;
  return out.map((r) => r.id);
}

/**
 * A student alone on a daily rule (lessons on days 1–10) with an 8-lesson package renewing on day 30, and a group
 * rule with another student (lessons on days 2 and 4, 10:00Z).
 */
export async function seedPause(tx: Tx): Promise<PauseSeed> {
  const [teacher] = await tx<{ id: string; profile_id: string }[]>`
    select t.id, t.profile_id from public.teachers t join auth.users u on u.id = t.profile_id where u.email = ${USERS.teacher.email}`;
  if (!teacher) throw new Error('e2e teacher missing (global setup)');
  const [{ today } = { today: '' }] = await tx<{ today: string }[]>`select ((now() at time zone 'Asia/Riyadh')::date)::text as today`;
  const s = await student(tx, 'طالب الإيقاف');
  const other = await student(tx, 'زميل الحلقة');
  const [sub] = await tx<{ id: string }[]>`insert into public.subscriptions
      (student_id, duration, lessons_total, price, price_source, starts_on, renews_on, status)
    values (${s}, 45, 8, 0, '{}'::jsonb, ${today}, (${today}::date + 30), 'active') returning id`;
  if (!sub) throw new Error('subscription not written');
  const solo = await rule(tx, { teacher: teacher.id, today, students: [s], sub: sub.id });
  const group = await rule(tx, { teacher: teacher.id, today, students: [s, other], sub: null });
  await generate(tx, { rule: solo, today, days: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });
  await generate(tx, { rule: group, today, days: [2, 4], hourZ: 10 });
  return { today, actor: teacher.profile_id, student: s, other, sub: sub.id, solo, group };
}

export const start = (tx: Tx, p: Record<string, unknown>) =>
  tx<{ r: Record<string, unknown> }[]>`select public.course_pause_start(${tx.json(p as never)}) as r`.then((rows) => rows[0]?.r ?? {});
export const resume = (tx: Tx, p: Record<string, unknown>) =>
  tx<{ r: Record<string, unknown> }[]>`select public.course_pause_resume(${tx.json(p as never)}) as r`.then((rows) => rows[0]?.r ?? {});
export const begin = (tx: Tx, pauseId: string) =>
  tx<{ r: Record<string, unknown> }[]>`select public.course_pause_begin(${tx.json({ pause_id: pauseId, actor: null })}) as r`.then((rows) => rows[0]?.r ?? {});
export const setUntil = (tx: Tx, p: Record<string, unknown>) =>
  tx<{ r: Record<string, unknown> }[]>`select public.course_pause_set_until(${tx.json(p as never)}) as r`.then((rows) => rows[0]?.r ?? {});

/** The student's lessons of a rule: day offset (Riyadh) → status, reason, chargeable. */
export const lessonsOf = (tx: Tx, o: { rule: string; student: string }) => tx<{ day: number; status: string; cancel_reason: string | null; chargeable: boolean | null }[]>`
  select ((l.starts_at at time zone 'Asia/Riyadh')::date - (now() at time zone 'Asia/Riyadh')::date)::int as day,
         l.status::text, l.cancel_reason, ls.chargeable
  from public.lessons l left join public.lesson_students ls on ls.lesson_id = l.id and ls.student_id = ${o.student}
  where l.rule_id = ${o.rule} order by l.starts_at`;

/** Who is on each group lesson: day offset → student ids. */
export const groupOf = (tx: Tx, rule: string) => tx<{ day: number; students: string[] }[]>`
  select ((l.starts_at at time zone 'Asia/Riyadh')::date - (now() at time zone 'Asia/Riyadh')::date)::int as day,
         coalesce(array_agg(ls.student_id::text order by ls.student_id) filter (where ls.student_id is not null), '{}') as students
  from public.lessons l left join public.lesson_students ls on ls.lesson_id = l.id
  where l.rule_id = ${rule} and l.status in ('scheduled', 'confirmed') group by l.id, l.starts_at order by l.starts_at`;

export const day = (today: string, n: number) => new Date(Date.parse(`${today}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
export const pauseOf = (s: PauseSeed, from: number, until: number | null) => ({
  student_id: s.student, from_date: day(s.today, from), until_date: until === null ? null : day(s.today, until), reason: 'سفر', actor: s.actor,
});
export const statuses = async (tx: Tx, s: PauseSeed) => {
  const [row] = await tx<{ student: string; sub: string; renews: string; rule: string; ends: string }[]>`
    select st.status::text as student, sb.status::text as sub, sb.renews_on::text as renews, r.status::text as rule, r.ends_on::text as ends
    from public.students st, public.subscriptions sb, public.schedule_rules r
    where st.id = ${s.student} and sb.id = ${s.sub} and r.id = ${s.solo}`;
  return row;
};
export const codeOf = (tx: Tx, run: (sp: Tx) => Promise<unknown>) =>
  tx.savepoint((sp) => run(sp as unknown as Tx)).then(() => 'ok', (e: { message?: string }) => e.message);
