import { expect, test } from '@playwright/test';
import { rolledBack, type Tx } from '../../support/core/rls';
import {
  ANON_DEFINERS,
  ANON_READABLE,
  AUTHENTICATED_DEFINERS,
} from '../../support/platform/rls-allow';
import {
  anonReadable,
  callableDefiners,
  outside,
  tablesWithoutRls,
} from '../../support/platform/rls-catalogue';

// The whole public schema at once (audit OPS-8, docs/58 §4): clients hold the anon key and a
// user JWT, so a new table without RLS or a client-callable SECURITY DEFINER function is a leak
// no per-table spec would see. Rolled back; database only.

const PROBE = 'rls_catalogue_probe';

/** A table with RLS off, one anon may read, and a definer function left at default grants. */
async function plantViolations(tx: Tx): Promise<void> {
  await tx.unsafe(`create table public.${PROBE} (id int primary key)`);
  await tx.unsafe(`create table public.${PROBE}_open (id int primary key)`);
  await tx.unsafe(`alter table public.${PROBE}_open enable row level security`);
  await tx.unsafe(`grant select on public.${PROBE}_open to anon`);
  await tx.unsafe(`create policy ${PROBE}_read on public.${PROBE}_open for select
    to anon using (true)`);
  await tx.unsafe(`create function public.${PROBE}_fn() returns int
    language sql security definer set search_path = '' as 'select 1'`);
  await tx.unsafe(`grant execute on function public.${PROBE}_fn() to anon, authenticated`);
}

test.describe('RLS and grants across the public schema', () => {
  test.beforeEach(() =>
    test.skip(test.info().project.name !== 'desktop', 'database only: one run'),
  );

  test('the checks flag a planted table, anon policy and definer function', async () => {
    await rolledBack(async (tx) => {
      await plantViolations(tx);
      expect(await tablesWithoutRls(tx)).toContain(PROBE);
      expect(outside(await anonReadable(tx), ANON_READABLE)).toContain(`${PROBE}_open`);
      expect(outside(await callableDefiners(tx, 'anon'), ANON_DEFINERS)).toContain(
        `${PROBE}_fn()`,
      );
      expect(
        outside(await callableDefiners(tx, 'authenticated'), AUTHENTICATED_DEFINERS),
      ).toContain(`${PROBE}_fn()`);
    });
  });

  test('every table in public has row level security on', async () => {
    await rolledBack(async (tx) => {
      expect(await tablesWithoutRls(tx)).toEqual([]);
    });
  });

  test('anon reads only the allow-listed tables and views', async () => {
    await rolledBack(async (tx) => {
      expect(outside(await anonReadable(tx), ANON_READABLE)).toEqual([]);
    });
  });

  test('no SECURITY DEFINER function outside the allow-lists is callable by a client', async () => {
    await rolledBack(async (tx) => {
      expect.soft(outside(await callableDefiners(tx, 'anon'), ANON_DEFINERS)).toEqual([]);
      const signedIn = await callableDefiners(tx, 'authenticated');
      expect.soft(outside(signedIn, AUTHENTICATED_DEFINERS)).toEqual([]);
    });
  });

  test('every allow-list entry still exists, so the lists only shrink', async () => {
    await rolledBack(async (tx) => {
      const live = new Set([
        ...(await anonReadable(tx)),
        ...(await callableDefiners(tx, 'authenticated')),
        ...(await callableDefiners(tx, 'anon')),
      ]);
      const listed = [ANON_READABLE, ANON_DEFINERS, AUTHENTICATED_DEFINERS].flatMap(Object.keys);
      expect(listed.filter((name) => !live.has(name))).toEqual([]);
    });
  });
});
