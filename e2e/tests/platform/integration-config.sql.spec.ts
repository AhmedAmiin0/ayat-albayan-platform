import { expect, test } from '@playwright/test';
import { as, rolledBack, userId, type Tx } from '../../support/core/rls';
import { USERS } from '../../support/core/users';

// Migration 310 (owner, 2026-10-12: config in the database): integration_config is readable by
// admins only and written by the service role; the Vault functions run for the service role only.
// Values here are obviously fake and every test rolls back.

const code = (tx: Tx, q: () => Promise<unknown>) => tx.savepoint(q).then(() => 'ok', (e: { code?: string }) => e.code);
const clearClaims = (tx: Tx) => tx`select set_config('request.jwt.claims', '', true)`;

/** Runs `q` as the service role (JWT role service_role), then back to the owner with no claims. */
async function asService<T>(tx: Tx, q: () => Promise<T>): Promise<T> {
  await tx`select set_config('request.jwt.claims', ${JSON.stringify({ role: 'service_role' })}, true)`;
  await tx`set local role service_role`;
  const out = await q();
  await tx`reset role`;
  await clearClaims(tx);
  return out;
}

/** Runs `q` as anon (no JWT subject). */
async function asAnon<T>(tx: Tx, q: () => Promise<T>): Promise<T> {
  await tx`select set_config('request.jwt.claims', ${JSON.stringify({ role: 'anon' })}, true)`;
  await tx`set local role anon`;
  const out = await q();
  await tx`reset role`;
  return out;
}

const SECRET_CALLS = (tx: Tx) => [
  () => tx`select public.integration_secret_set('WA_APP_SECRET', 'e2e-fake-secret')`,
  () => tx`select public.integration_secret_clear('WA_APP_SECRET')`,
  () => tx`select * from public.integration_secrets_read()`,
  () => tx`select * from public.integration_secrets_status()`,
];

test.describe('integration config (migration 310)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('anon and a signed-in admin cannot execute any secret function', async () => {
    await rolledBack(async (tx) => {
      const admin = await userId(tx, USERS.admin.email);
      for (const call of SECRET_CALLS(tx)) {
        expect(await code(tx, () => asAnon(tx, call))).toBe('42501');
        expect(await code(tx, () => as(tx, admin, call))).toBe('42501');
      }
    });
  });

  test('a non-admin reads no row; an admin reads them; no client session writes', async () => {
    await rolledBack(async (tx) => {
      const admin = await userId(tx, USERS.admin.email);
      const teacher = await userId(tx, USERS.teacher.email);
      await tx`insert into public.integration_config (key, value) values ('WA_WABA_ID', 'e2e-waba')`;
      const keys = (uid: string) => as(tx, uid, () => tx<{ key: string }[]>`select key from public.integration_config`);
      expect(await keys(teacher)).toEqual([]);
      await clearClaims(tx);
      expect((await keys(admin)).map((r) => r.key)).toEqual(['WA_WABA_ID']);
      await clearClaims(tx);
      const write = () => as(tx, admin, () => tx`insert into public.integration_config (key, value) values ('WA_APP_ID', 'x')`);
      expect(await code(tx, write)).toBe('42501');
      await clearClaims(tx);
      expect(await code(tx, () => asAnon(tx, () => tx`select key from public.integration_config`))).toBe('42501');
    });
  });

  test('the service role sets, reads and clears a secret; the status never carries the value', async () => {
    await rolledBack(async (tx) => {
      await asService(tx, () => tx`select public.integration_secret_set('WA_APP_SECRET', 'e2e-fake-secret')`);
      await asService(tx, () => tx`select public.integration_secret_set('WA_APP_SECRET', 'e2e-fake-secret-2')`);
      const read = await asService(tx, () => tx<{ key: string; value: string }[]>`select * from public.integration_secrets_read()`);
      expect(read.filter((r) => r.key === 'WA_APP_SECRET').map((r) => r.value)).toEqual(['e2e-fake-secret-2']);
      const status = await asService(tx, () => tx<Record<string, unknown>[]>`select * from public.integration_secrets_status()`);
      const row = status.find((r) => r['key'] === 'WA_APP_SECRET');
      expect(Object.keys(row ?? {}).sort()).toEqual(['key', 'updated_at']);
      const cleared = await asService(tx, () => tx<{ c: boolean }[]>`select public.integration_secret_clear('WA_APP_SECRET') as c`);
      expect(cleared[0]?.c).toBe(true);
      const after = await asService(tx, () => tx<{ key: string }[]>`select key from public.integration_secrets_read()`);
      expect(after.map((r) => r.key)).not.toContain('WA_APP_SECRET');
    });
  });

  test('only the registry\'s secret keys are accepted', async () => {
    await rolledBack(async (tx) => {
      const set = (key: string) => () => asService(tx, () => tx`select public.integration_secret_set(${key}, 'e2e-fake')`);
      expect(await code(tx, set('SUPABASE_SERVICE_ROLE_KEY'))).toBe('22023');
      expect(await code(tx, set('WA_WABA_ID'))).toBe('22023');
      expect(await code(tx, () => asService(tx, () => tx`select public.integration_secret_set('WA_APP_SECRET', '  ')`))).toBe('22023');
    });
  });
});
