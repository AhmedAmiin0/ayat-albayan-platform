import { SEED_ENTRIES } from '@ab/shared';
import { expect, test } from '@playwright/test';
import { runConfigSeed } from '../../support/platform/config-seed';
import { rolledBack, type Tx } from '../../support/rls';

// 26-P2 «Copy» (docs/26 §2b, §4) against the real database, every test rolled back: the seeder's real
// payload (SEED_ENTRIES + the Arabic hints) booted twice changes no value, version or updated_at, and a
// missing row, a JSON null and a seeded null read the same in the SQL readers. The send-gate rows are
// only deleted inside the rolled-back transaction: nothing here can turn sending on.

type Row = { key: string; value: unknown; version: string; updated_at: Date };
const all = (tx: Tx) => tx<Row[]>`select key, value, version::text as version, updated_at from public.settings order by key`;
const rev = async (tx: Tx) => {
  await tx`set constraints public.settings_revision_bump immediate`;
  return (await tx<{ rev: string }[]>`select rev::text as rev from public.settings_revision`)[0]?.rev;
};
const gateOff = async (tx: Tx) => {
  const rows = await tx<{ key: string; on: boolean }[]>`select key, coalesce(value = 'true'::jsonb, false) as on
    from public.settings where key in ('messaging_enabled', 'auto_messages_enabled')`;
  return rows.every((r) => !r.on);
};
const byKey = (a: { key: string }, b: { key: string }) => a.key.localeCompare(b.key);
const gateRows = async (tx: Tx) =>
  (await tx<{ key: string; on: boolean }[]>`select key, coalesce(value = 'true'::jsonb, false) as on
    from public.settings where key in ('messaging_enabled', 'auto_messages_enabled')`).sort(byKey);
const google = (tx: Tx) => tx<{ on: boolean; days: number }[]>`
  select public.google_sync_on() as on, public.google_sync_window_days() as days`;

test.describe('config seeder (26-P2, real payload)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('two boots: every key gets a row, and the second boot changes nothing', async () => {
    await rolledBack(async (tx) => {
      await tx`delete from public.settings where key in ('booking_horizon_weeks', 'messaging_enabled')`;
      await tx`update public.settings_revision set registry_version = 0`;
      await tx`insert into public.settings (key, value) values ('booking_horizon_weeks', 'null')`;
      const before = (await all(tx)).filter((r) => r.key !== 'messaging_enabled');
      const gateBefore = await gateRows(tx);
      const first = await runConfigSeed(tx);
      expect(first['failed']).toEqual([]);
      const keys = (await all(tx)).map((r) => r.key);
      for (const e of SEED_ENTRIES) expect(keys, e.key).toContain(e.key);
      // Existing rows (false, JSON null, real values) keep value, version and updated_at.
      const after = await all(tx);
      for (const b of before) expect(after.find((r) => r.key === b.key), b.key).toEqual(b);
      const r1 = await rev(tx);
      expect(await runConfigSeed(tx)).toEqual({ applied: 0, failed: [] });
      expect(await rev(tx)).toBe(r1);
      expect(await all(tx)).toEqual(after);
      // The seeder never moves a switch: the deleted messaging_enabled is now JSON null (= OFF), and
      // auto_messages_enabled keeps whatever the e2e database holds (seedSettings turns it on).
      expect(await gateRows(tx)).toEqual([...gateBefore, { key: 'messaging_enabled', on: false }].sort(byKey));
    });
  });

  test('the Arabic hint is seeded as description_seed; an admin description is never overwritten', async () => {
    await rolledBack(async (tx) => {
      await tx`update public.settings_revision set registry_version = 0`;
      await tx`insert into public.settings (key, value, description, description_edited)
        values ('upload_max_mb', 'null', 'نص المشرف', true)
        on conflict (key) do update set description = 'نص المشرف', description_edited = true`;
      await runConfigSeed(tx);
      const [row] = await tx<{ seed: string | null; d: string | null }[]>`
        select description_seed as seed, description as d from public.settings where key = 'upload_max_mb'`;
      expect(row?.seed).toBeTruthy();
      expect(row?.d).toBe('نص المشرف');
    });
  });

  test('a missing row, a JSON null and a seeded null read the same in SQL; the gate stays closed', async () => {
    const KEYS = ['google_sync_enabled', 'google_calendar_window_days', 'messaging_enabled', 'auto_messages_enabled'];
    const reads: unknown[] = [];
    for (const state of ['missing', 'null', 'seeded'] as const) {
      await rolledBack(async (tx) => {
        await tx`delete from public.settings where key = any(${KEYS})`;
        if (state === 'null') {
          for (const key of KEYS) await tx`insert into public.settings (key, value) values (${key}, 'null')`;
        }
        if (state === 'seeded') {
          await tx`update public.settings_revision set registry_version = 0`;
          await runConfigSeed(tx);
        }
        reads.push(await google(tx));
        expect(await gateOff(tx), state).toBe(true);
      });
    }
    expect(reads[1]).toEqual(reads[0]);
    expect(reads[2]).toEqual(reads[0]);
    expect(reads[0]).toEqual([{ on: false, days: 60 }]);
  });
});
