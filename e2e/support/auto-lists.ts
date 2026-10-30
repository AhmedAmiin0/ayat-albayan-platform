import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Tx } from './core/rls';

// Helpers for the automatic chat lists spec (migration 20261025000710, docs/22 «القوائم التلقائية»).

const MIGRATION = fileURLToPath(new URL('../../packages/db/supabase/migrations/20261025000710_chat_list_auto_rules.sql', import.meta.url));

/** Runs the migration again inside the test's transaction (it is idempotent: attach, backfill, triggers). */
export const rerunMigration = (tx: Tx) => tx.unsafe(readFileSync(MIGRATION, 'utf8'));

export async function listOf(tx: Tx, rule: 'subscribed' | 'teachers'): Promise<string> {
  const [row] = await tx<{ id: string }[]>`select id from public.chat_lists where auto_rule = ${rule}`;
  if (!row) throw new Error(`no ${rule} list`);
  return row.id;
}

/** The test's members (+9665000007…), each as its phone, then «*» when a person added it (added_by set). */
export async function members(tx: Tx, list: string): Promise<string[]> {
  const rows = await tx<{ phone_e164: string; added_by: string | null }[]>`select phone_e164, added_by
    from public.chat_list_threads where list_id = ${list} and phone_e164 like '+9665000007%' order by phone_e164`;
  return rows.map((r) => (r.added_by === null ? r.phone_e164 : `${r.phone_e164}*`));
}

/** Any profile id, to stand for a person who added a member by hand. */
export async function someone(tx: Tx): Promise<string> {
  const [p] = await tx<{ id: string }[]>`select id from public.profiles limit 1`;
  if (!p) throw new Error('no profile');
  return p.id;
}

export async function guardian(tx: Tx, phone: string): Promise<string> {
  const [g] = await tx<{ id: string }[]>`insert into public.guardians (name, phone_e164) values ('ولي أمر تلقائي', ${phone}) returning id`;
  if (!g) throw new Error('no guardian');
  return g.id;
}

export async function student(tx: Tx, input: { guardian: string; status: string }): Promise<string> {
  const [s] = await tx<{ id: string }[]>`insert into public.students (guardian_id, name, name_normalized, status)
    values (${input.guardian}, 'طالب تلقائي', 'طالب تلقائي', ${input.status}::public.student_status) returning id`;
  if (!s) throw new Error('no student');
  return s.id;
}

export async function teacher(tx: Tx, input: { phone: string | null; status: string }): Promise<string> {
  const [row] = await tx<{ id: string }[]>`insert into public.teachers (display_name_ar, gender, phone_e164, status)
    values ('معلم تلقائي', 'male', ${input.phone}, ${input.status}::public.teacher_status) returning id`;
  if (!row) throw new Error('no teacher');
  return row.id;
}
