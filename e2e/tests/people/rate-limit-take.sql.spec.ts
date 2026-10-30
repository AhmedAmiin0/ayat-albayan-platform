import { expect, test } from '@playwright/test';
import { rolledBack, type Tx } from '../../support/rls';

// Migration 20261028000935 (docs/09 «Two API copies + one worker»): rate_limit_take is the sign-in limits'
// sliding window shared by every API copy. Run against Postgres: max hits pass, the next one is refused,
// the first full bucket stops the later ones untouched; only the service role may call it. Rolled back.

const code = (tx: Tx, q: () => Promise<unknown>) => tx.savepoint(q).then(() => 'ok', (e: { code?: string }) => e.code);

/** Runs `q` as `role` (JWT role claim too), then back to the owner with no claims (a failed `q` inside a savepoint is undone with it). */
async function as<T>(tx: Tx, role: 'service_role' | 'anon' | 'authenticated', q: () => Promise<T>): Promise<T> {
  await tx`select set_config('request.jwt.claims', ${JSON.stringify({ role })}, true)`;
  await tx.unsafe(`set local role ${role}`);
  const out = await q();
  await tx`reset role`;
  await tx`select set_config('request.jwt.claims', '', true)`;
  return out;
}

async function take(tx: Tx, buckets: string[], maxes: number[]): Promise<boolean> {
  const [row] = await tx<{ ok: boolean }[]>`select public.rate_limit_take(${buckets}::text[], ${maxes}::int[], 60000) as ok`;
  return row?.ok === true;
}

const hits = async (tx: Tx, bucket: string) =>
  (await tx<{ n: number }[]>`select count(*)::int as n from public.rate_limit_hits where bucket = ${bucket}`)[0]?.n;

test.describe('rate_limit_take (migration 935)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('max calls pass and call max+1 is refused; a full first bucket leaves the next one untouched', async () => {
    await rolledBack(async (tx) => {
      const results: boolean[] = [];
      for (let i = 0; i < 4; i += 1) results.push(await as(tx, 'service_role', () => take(tx, ['e2e:ip:a'], [3])));
      expect(results).toEqual([true, true, true, false]);
      expect(await hits(tx, 'e2e:ip:a')).toBe(3);
      expect(await as(tx, 'service_role', () => take(tx, ['e2e:ip:a', 'e2e:id:b'], [3, 5]))).toBe(false);
      expect(await hits(tx, 'e2e:id:b')).toBe(0);
    });
  });

  test('anon and authenticated may neither call it nor read the hits', async () => {
    await rolledBack(async (tx) => {
      for (const role of ['anon', 'authenticated'] as const) {
        expect(await code(tx, () => as(tx, role, () => take(tx, ['e2e:ip:c'], [3])))).toBe('42501');
        expect(await code(tx, () => as(tx, role, () => tx`select 1 from public.rate_limit_hits`))).toBe('42501');
      }
    });
  });
});
