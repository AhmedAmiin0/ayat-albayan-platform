import { expect, test } from '@playwright/test';
import { as, rolledBack, userId, type Tx } from '../support/rls';
import { USERS } from '../support/users';

// Migration 20261012000370 (R-ACC-05, rule 9): the private 'avatars' bucket. A signed-in user
// writes and reads only under their own folder `<uid>/…`; an admin reads every avatar; anon reads
// nothing. public.profiles has no self-write: a non-admin's UPDATE of their own row changes nothing.

/** Runs `q` in a savepoint: 'ok' or the Postgres error code. */
const code = (tx: Tx, q: () => Promise<unknown>) =>
  tx.savepoint(() => q()).then(() => 'ok', (e: { code?: string }) => e.code);

async function avatar(tx: Tx, name: string): Promise<void> {
  await tx`insert into storage.objects (bucket_id, name) values ('avatars', ${name})`;
}

async function names(tx: Tx): Promise<string[]> {
  const rows = await tx<{ name: string }[]>`select name from storage.objects
    where bucket_id = 'avatars' and name like '%/avatar-rls.png' order by name`;
  return rows.map((r) => r.name);
}

test.describe('avatars storage + profiles self-write (migration 370)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('the avatars bucket exists, is private, 2 MB, images only', async () => {
    await rolledBack(async (tx) => {
      const [b] = await tx<{ public: boolean; file_size_limit: number; mimes: string[] }[]>`
        select public, file_size_limit::int as file_size_limit, allowed_mime_types as mimes
        from storage.buckets where id = 'avatars'`;
      expect(b).toEqual({ public: false, file_size_limit: 2_097_152, mimes: ['image/jpeg', 'image/png', 'image/webp'] });
    });
  });

  test('a user inserts under their own uid only', async () => {
    await rolledBack(async (tx) => {
      const teacher = await userId(tx, USERS.teacher.email);
      const admin = await userId(tx, USERS.admin.email);
      expect(await code(tx, () => as(tx, teacher, () => avatar(tx, `${teacher}/avatar-1.png`)))).toBe('ok');
      expect(await code(tx, () => as(tx, teacher, () => avatar(tx, `${admin}/avatar-1.png`)))).toBe('42501');
      expect(await code(tx, () => as(tx, teacher, () => avatar(tx, 'avatar-1.png')))).toBe('42501');
    });
  });

  test('a user reads only their own avatar, the admin reads all, anon reads none', async () => {
    await rolledBack(async (tx) => {
      const teacher = await userId(tx, USERS.teacher.email);
      const admin = await userId(tx, USERS.admin.email);
      await avatar(tx, `${teacher}/avatar-rls.png`);
      await avatar(tx, `${admin}/avatar-rls.png`);

      expect(await as(tx, teacher, () => names(tx))).toEqual([`${teacher}/avatar-rls.png`]);
      expect(await as(tx, admin, () => names(tx))).toEqual([`${admin}/avatar-rls.png`, `${teacher}/avatar-rls.png`].sort());

      // No grant or no matching policy: either way anon sees no avatar.
      const anon = await tx.savepoint(async (sp) => {
        await sp`set local role anon`;
        return names(sp);
      }).catch((e: { code?: string }) => e.code);
      expect([[], '42501']).toContainEqual(anon);
    });
  });

  test('a user cannot rename another user\'s avatar into their folder', async () => {
    await rolledBack(async (tx) => {
      const teacher = await userId(tx, USERS.teacher.email);
      const admin = await userId(tx, USERS.admin.email);
      await avatar(tx, `${admin}/avatar-rls.png`);
      const updated = await as(tx, teacher, () => tx`update storage.objects set name = ${`${teacher}/stolen.png`}
        where bucket_id = 'avatars' and name = ${`${admin}/avatar-rls.png`}`);
      expect(updated.count).toBe(0);
      expect(await names(tx)).toEqual([`${admin}/avatar-rls.png`]);
    });
  });

  test('profiles: a non-admin UPDATE of their own role or avatar_path changes nothing', async () => {
    await rolledBack(async (tx) => {
      const teacher = await userId(tx, USERS.teacher.email);
      const before = await tx<{ role: string; avatar_path: string | null }[]>`
        select role::text as role, avatar_path from public.profiles where id = ${teacher}`;
      const own = (q: () => Promise<{ count: number }>) =>
        tx.savepoint(() => as(tx, teacher, q)).then((r) => r.count, (e: { code?: string }) => e.code);
      expect([0, '42501']).toContain(await own(() => tx`update public.profiles set role = 'admin' where id = ${teacher}`));
      expect([0, '42501']).toContain(await own(() => tx`update public.profiles set avatar_path = ${`${teacher}/x.png`} where id = ${teacher}`));
      const after = await tx<{ role: string; avatar_path: string | null }[]>`
        select role::text as role, avatar_path from public.profiles where id = ${teacher}`;
      expect(after).toEqual(before);
      expect(after[0]?.role).toBe('teacher');
    });
  });
});
