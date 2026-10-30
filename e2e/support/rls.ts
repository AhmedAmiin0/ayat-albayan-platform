import type { TransactionSql } from 'postgres';
import { withSql } from './core/schedule';

// Helpers for the SQL-level RLS specs: a rolled-back transaction, queries as a signed-in user.

export type Tx = TransactionSql;
const ROLLBACK = new Error('rollback');

export async function rolledBack(run: (tx: Tx) => Promise<void>): Promise<void> {
  await withSql(async (sql) => {
    await sql
      .begin(async (tx) => {
        await run(tx);
        throw ROLLBACK;
      })
      .catch((e: unknown) => {
        if (e !== ROLLBACK) throw e;
      });
  });
}

/**
 * Runs `query` as `authenticated` with this user's JWT, then back to the owner role. On an error
 * the caller's savepoint rollback undoes both SET LOCALs.
 */
export async function as<T>(tx: Tx, userId: string, query: () => Promise<T>): Promise<T> {
  await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: 'authenticated' })}, true)`;
  await tx`set local role authenticated`;
  const result = await query();
  await tx`reset role`;
  return result;
}

export async function userId(tx: Tx, email: string): Promise<string> {
  const [u] = await tx<{ id: string }[]>`select id from auth.users where email = ${email}`;
  if (!u) throw new Error(`${email} missing (global setup)`);
  return u.id;
}

/** A guardian with one child, taught by `teacherId` (students.teacher_id). */
export async function family(tx: Tx, input: { phone: string; teacherId: string; status?: 'trial' | 'active' }): Promise<string> {
  const [g] = await tx<{ id: string }[]>`insert into public.guardians (name, phone_e164, country, tz)
    values ('ولي أمر RLS', ${input.phone}, 'SA', 'Asia/Riyadh') returning id`;
  if (!g) throw new Error('guardian not written');
  const [s] = await tx<{ id: string }[]>`insert into public.students (guardian_id, name, name_normalized, tz, teacher_id, status)
    values (${g.id}, 'طالب RLS', 'طالب rls', 'Asia/Riyadh', ${input.teacherId}, ${input.status ?? 'trial'}::public.student_status) returning id`;
  if (!s) throw new Error('student not written');
  return s.id;
}

export async function lesson(tx: Tx, input: { teacherId: string; studentId: string; daysAgo: number }): Promise<void> {
  const [l] = await tx<{ id: string }[]>`insert into public.lessons (teacher_id, starts_at, ends_at)
    values (${input.teacherId}, now() - make_interval(days => ${input.daysAgo}),
      now() - make_interval(days => ${input.daysAgo}) + interval '30 minutes') returning id`;
  if (!l) throw new Error('lesson not written');
  await tx`insert into public.lesson_students (lesson_id, student_id) values (${l.id}, ${input.studentId})`;
}

