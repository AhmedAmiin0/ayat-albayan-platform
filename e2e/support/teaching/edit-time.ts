import type { TransactionSql } from 'postgres';
import { withSql } from '../schedule';
import { USERS } from '../users';

// Helpers of e2e/tests/edit-time.sql.spec.ts: edit_lesson_time (migration 174, R-SCH-11) against
// the real database inside a transaction that is rolled back.

export type Tx = TransactionSql;
const ROLLBACK = new Error('rollback');
export const HOUR = 3_600_000;
export const MIN = 60_000;

export async function rolledBack(run: (tx: Tx) => Promise<void>): Promise<void> {
  await withSql(async (sql) => {
    await sql.begin(async (tx) => {
      await run(tx);
      throw ROLLBACK;
    }).catch((e: unknown) => {
      if (e !== ROLLBACK) throw e;
    });
  });
}

export const iso = (ms: number) => new Date(ms).toISOString();
/** A day in the future at 14:00Z, whole days only so the generated key is stable. */
export const BASE = Math.floor((Date.now() + 10 * 24 * HOUR) / (24 * HOUR)) * 24 * HOUR + 14 * HOUR;

/** A daily 45-minute rule with one generated lesson at BASE, one student, one guardian. */
export async function seed(tx: Tx) {
  const [teacher] = await tx<{ id: string; profile_id: string }[]>`
    select t.id, t.profile_id from public.teachers t join auth.users u on u.id = t.profile_id
    where u.email = ${USERS.teacher.email}`;
  if (!teacher) throw new Error('e2e teacher missing (global setup)');
  const [g] = await tx<{ id: string }[]>`insert into public.guardians (name, phone_e164, country, tz)
    values ('ولي أمر SQL', '+966500000997', 'SA', 'Asia/Riyadh') returning id`;
  const [s] = await tx<{ id: string }[]>`insert into public.students (guardian_id, name, name_normalized, tz)
    values (${g?.id ?? ''}, 'طالب SQL', 'طالب SQL', 'Asia/Riyadh') returning id`;
  const [rule] = await tx<{ id: string }[]>`insert into public.schedule_rules
    (teacher_id, duration_min, start_time_local, tz, byday, starts_on)
    values (${teacher.id}, 45, '17:00', 'Asia/Riyadh', '{0,1,2,3,4,5,6}', current_date) returning id`;
  if (!g || !s || !rule) throw new Error('seed failed');
  await tx`insert into public.schedule_rule_students (rule_id, student_id) values (${rule.id}, ${s.id})`;
  const [lesson] = await tx<{ id: string }[]>`select id from public.generate_rule_lessons(
    ${rule.id}, ${tx.json([{ starts_at: iso(BASE), ends_at: iso(BASE + 45 * MIN) }])}, null)`;
  if (!lesson) throw new Error('lesson not generated');
  await tx`insert into public.lesson_students (lesson_id, student_id) values (${lesson.id}, ${s.id})
    on conflict do nothing`;
  return { teacher, guardian: g.id, student: s.id, rule: rule.id, lesson: lesson.id };
}
type Seeded = Awaited<ReturnType<typeof seed>>;

export type Edit = {
  s: Seeded;
  status: string;
  from: number;
  to: number;
  durationMin?: number;
  flags?: { retime_open?: boolean; refresh_pdf?: boolean };
  messages?: Record<string, string | Record<string, string>>[];
};

/** edit_lesson_time as the API calls it (`from` is what the admin saw, 45 minutes long). */
export async function edit(tx: Tx, e: Edit) {
  const p = {
    actor: e.s.teacher.profile_id,
    lesson_id: e.s.lesson,
    from: { status: e.status, starts_at: iso(e.from), ends_at: iso(e.from + 45 * MIN) },
    to: { starts_at: iso(e.to), ends_at: iso(e.to + (e.durationMin ?? 45) * MIN) },
    reason: 'SQL test',
    override_reason: null,
    retime_open: false,
    refresh_pdf: false,
    ...e.flags,
    messages: e.messages ?? [],
    audit: { entity: 'lessons', entity_id: e.s.lesson, action: 'time_edit', before: {}, after: { mode: 'test' } },
  };
  await tx`select public.edit_lesson_time(${tx.json(p)})`;
}
