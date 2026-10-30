import { expect, test } from '@playwright/test';
import { rolledBack, userId, type Tx } from '../../support/rls';
import { USERS } from '../../support/users';

// Migration 730 (review of #177): PUT /me/push-tokens' takeover rule in one locked statement.
// A token bound to another profile's live session moves only with that binding's device key.

const T = 'ExponentPushToken[e2e-claim]';
const H1 = '1'.repeat(64);
const H2 = '2'.repeat(64);

async function session(tx: Tx, user: string): Promise<string> {
  const [s] = await tx<{ id: string }[]>`insert into auth.sessions (id, user_id, created_at, updated_at)
    values (gen_random_uuid(), ${user}, now(), now()) returning id`;
  if (!s) throw new Error('session not written');
  return s.id;
}

async function claim(tx: Tx, args: { user: string; session: string; fresh: string; presented?: string }): Promise<string> {
  const [r] = await tx<{ r: string }[]>`select public.claim_push_device(${T}, ${args.user}, ${args.session}, ${args.fresh},
    ${args.presented ?? null}) r`;
  return r?.r ?? '';
}

const binding = async (tx: Tx) =>
  (await tx<{ profile_id: string; device_key_hash: string | null; contested: boolean }[]>`select profile_id,
    device_key_hash, contested_at is not null contested from public.push_device_sessions where token = ${T}`)[0];

test.describe('claim_push_device (migration 730)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('attack: another profile’s live device on the token alone → in_use, contested, never moved', async () => {
    await rolledBack(async (tx) => {
      const [teacher, admin] = [await userId(tx, USERS.teacher.email), await userId(tx, USERS.admin.email)];
      expect(await claim(tx, { user: teacher, session: await session(tx, teacher), fresh: H1 })).toBe('bound');
      const adminSession = await session(tx, admin);
      expect(await claim(tx, { user: admin, session: adminSession, fresh: H2 })).toBe('in_use');
      expect(await claim(tx, { user: admin, session: adminSession, fresh: H2, presented: H2 })).toBe('in_use');
      expect(await binding(tx)).toEqual({ profile_id: teacher, device_key_hash: H1, contested: true });
    });
  });

  test('legit: the same phone (its key) signed in as someone else → proven, moved, key kept, contest cleared', async () => {
    await rolledBack(async (tx) => {
      const [teacher, admin] = [await userId(tx, USERS.teacher.email), await userId(tx, USERS.admin.email)];
      await claim(tx, { user: admin, session: await session(tx, admin), fresh: H1 });
      expect(await claim(tx, { user: teacher, session: await session(tx, teacher), fresh: H2 })).toBe('in_use');
      expect(await claim(tx, { user: teacher, session: await session(tx, teacher), fresh: H2, presented: H1 })).toBe('proven');
      expect(await binding(tx)).toEqual({ profile_id: teacher, device_key_hash: H1, contested: false });
    });
  });

  test('a binding made before 720 (no key): no presented key and any presented key are both refused', async () => {
    await rolledBack(async (tx) => {
      const [teacher, admin] = [await userId(tx, USERS.teacher.email), await userId(tx, USERS.admin.email)];
      await claim(tx, { user: teacher, session: await session(tx, teacher), fresh: H1 });
      await tx`update public.push_device_sessions set device_key_hash = null where token = ${T}`;
      const adminSession = await session(tx, admin);
      expect(await claim(tx, { user: admin, session: adminSession, fresh: H2 })).toBe('in_use');
      expect(await claim(tx, { user: admin, session: adminSession, fresh: H2, presented: H1 })).toBe('in_use');
      expect(await binding(tx)).toEqual({ profile_id: teacher, device_key_hash: null, contested: true });
    });
  });

  test('the holder registering again clears its own contest (fresh key)', async () => {
    await rolledBack(async (tx) => {
      const [teacher, admin] = [await userId(tx, USERS.teacher.email), await userId(tx, USERS.admin.email)];
      const own = await session(tx, teacher);
      await claim(tx, { user: teacher, session: own, fresh: H1 });
      expect(await claim(tx, { user: admin, session: await session(tx, admin), fresh: H2 })).toBe('in_use');
      expect(await claim(tx, { user: teacher, session: own, fresh: H2 })).toBe('bound');
      expect(await binding(tx)).toEqual({ profile_id: teacher, device_key_hash: H2, contested: false });
    });
  });

  test('legit: the holder’s session ended → bound to the caller with the fresh key', async () => {
    await rolledBack(async (tx) => {
      const [teacher, admin] = [await userId(tx, USERS.teacher.email), await userId(tx, USERS.admin.email)];
      const old = await session(tx, admin);
      await claim(tx, { user: admin, session: old, fresh: H1 });
      await tx`update auth.sessions set not_after = now() - interval '1 minute' where id = ${old}`;
      expect(await claim(tx, { user: teacher, session: await session(tx, teacher), fresh: H2 })).toBe('bound');
      expect(await binding(tx)).toEqual({ profile_id: teacher, device_key_hash: H2, contested: false });
    });
  });

  test('a session that does not exist → no_session, nothing bound; clients cannot call it', async () => {
    await rolledBack(async (tx) => {
      const admin = await userId(tx, USERS.admin.email);
      const gone = '00000000-0000-4000-8000-000000000000';
      expect(await claim(tx, { user: admin, session: gone, fresh: H1 })).toBe('no_session');
      expect(await binding(tx)).toBeUndefined();
      const [g] = await tx<{ ok: boolean }[]>`select has_function_privilege('authenticated',
        'public.claim_push_device(text, uuid, uuid, text, text)', 'execute') ok`;
      expect(g?.ok).toBe(false);
    });
  });
});
