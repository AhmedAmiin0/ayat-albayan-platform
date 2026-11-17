import type { Tx } from '../core/rls';

// Helpers of the test-accounts SQL spec (migration 20261117120100). Written as the owner role
// inside the spec's rolled-back transaction, so the triggers run as in production.

/** 'ok', else the SQLSTATE. */
const sqlState = (e: unknown): string | undefined =>
  typeof e === 'object' && e !== null && 'code' in e ? String(e.code) : undefined;

export const code = (tx: Tx, q: () => Promise<unknown>) => tx.savepoint(q).then(() => 'ok', sqlState);

/** A family login (auth user + profile) with no link yet. */
export async function login(tx: Tx, tag: string, role: 'guardian' | 'student'): Promise<string> {
  const [u] = await tx<{ id: string }[]>`insert into auth.users (id, email)
    values (gen_random_uuid(), ${`${tag}@e2e.local`}) returning id`;
  if (!u) throw new Error('auth user not written');
  await tx`insert into public.profiles (id, role, full_name) values (${u.id}, ${role}, ${tag})`;
  return u.id;
}

/** A guardian with one child: { guardian, student }. */
interface Household {
  guardian: string;
  student: string;
}

export async function household(tx: Tx, phone: string): Promise<Household> {
  const [g] = await tx<{ id: string }[]>`insert into public.guardians (name, phone_e164, country, tz)
    values ('ولي أمر تجريبي', ${phone}, 'SA', 'Asia/Riyadh') returning id`;
  if (!g) throw new Error('guardian not written');
  const [s] = await tx<{ id: string }[]>`insert into public.students
      (guardian_id, name, name_normalized, tz)
    values (${g.id}, 'طالب تجريبي', 'طالب تجريبي', 'Asia/Riyadh') returning id`;
  if (!s) throw new Error('student not written');
  return { guardian: g.id, student: s.id };
}

/** The admin switch as the API calls it (service role function, owner here). */
export async function flip(tx: Tx, input: { kind: 'student' | 'profile'; id: string; on: boolean }) {
  await tx`select public.set_test_flag(${input.kind}, ${input.id}, ${input.on}, null)`;
  // The function defers the link checks to commit; back to immediate, which checks them now.
  await tx`set constraints all immediate`;
}

export async function flagOf(tx: Tx, table: 'profiles' | 'students', id: string): Promise<boolean> {
  const [r] = await tx.unsafe<{ t: boolean }[]>(`select is_test t from public.${table} where id = $1`, [id]);
  return r?.t ?? false;
}
