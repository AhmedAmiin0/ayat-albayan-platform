import { expect, test } from '@playwright/test';
import { as, rolledBack, userId, type Tx } from '../../support/rls';
import { USERS } from '../../support/users';

// Migration 630 (docs/26 §2a, 26-P1 «Expand») against the real database, every test rolled back. Only
// throwaway zz_e2e_* keys are written: never a messaging or gate key.

type Row = { key: string; value: unknown; version: string; updated_at: Date };
type Err = { code?: string; detail?: string };
const fail = (tx: Tx, q: () => Promise<unknown>) => tx.savepoint(q).then(() => ({} as Err), (e: Err) => e);
// ::text::jsonb: a bare ::jsonb makes postgres.js serialise the string again (a JSON string, not an array).
const json = (v: unknown) => JSON.stringify(v);

const ENTRIES = [
  { key: 'zz_e2e_false', module: 'academy', scope: 'config', value_type: 'bool', default_value: false, description_seed: 'a' },
  { key: 'zz_e2e_null', module: 'academy', scope: 'config', value_type: 'int', default_value: null, description_seed: 'b' },
  { key: 'zz_e2e_absent', module: 'academy', scope: 'config', value_type: 'bool', default_value: false },
];

const rows = (tx: Tx) => tx<Row[]>`
  select key, value, version::text as version, updated_at from public.settings where key like 'zz\_e2e\_%' order by key`;
// The bump is deferred to commit (no deadlock with autocommit writers); IMMEDIATE fires the pending ones.
const rev = async (tx: Tx) => {
  await tx`set constraints public.settings_revision_bump immediate`;
  return (await tx<{ rev: string }[]>`select rev::text as rev from public.settings_revision`)[0]?.rev;
};
const stored = async (tx: Tx) =>
  (await tx<{ v: number }[]>`select registry_version as v from public.settings_revision`)[0]?.v ?? 0;
const seed = async (tx: Tx, entries: unknown, version: number) =>
  (await tx<{ r: Record<string, unknown> }[]>`select public.config_seed(${json(entries)}::text::jsonb, ${version}::int) as r`)[0]?.r;
const set = async (tx: Tx, changes: unknown) =>
  (await tx<{ r: Record<string, number> }[]>`select public.config_set(${json(changes)}::text::jsonb, null) as r`)[0]?.r;

test.describe('settings expand (migration 630)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('the new columns, the revision row and the three checks exist (validated by 634)', async () => {
    await rolledBack(async (tx) => {
      const cols = await tx<{ c: string }[]>`select column_name as c from information_schema.columns
        where table_schema = 'public' and table_name = 'settings' order by column_name`;
      expect(cols.map((r) => r.c)).toEqual(['default_value', 'description', 'description_edited', 'description_seed',
        'is_public', 'key', 'module', 'retired_at', 'scope', 'updated_at', 'updated_by', 'value', 'value_type', 'version']);
      expect(await tx`select count(*)::int as n from public.settings_revision`).toEqual([{ n: 1 }]);
      const checks = await tx<{ conname: string; convalidated: boolean }[]>`select conname, convalidated
        from pg_constraint where conrelid = 'public.settings'::regclass
          and conname in ('settings_key_format', 'settings_kind', 'settings_value_size') order by conname`;
      expect(checks).toEqual(['settings_key_format', 'settings_kind', 'settings_value_size']
        .map((conname) => ({ conname, convalidated: true })));
      expect((await fail(tx, () => tx`insert into public.settings (key, value) values ('Bad Key', '1')`)).code).toBe('23514');
    });
  });

  test('config_seed twice changes no value, version or updated_at (false, JSON null, absent)', async () => {
    await rolledBack(async (tx) => {
      await tx`insert into public.settings (key, value) values ('zz_e2e_false', 'false'), ('zz_e2e_null', 'null')`;
      const before = await rows(tx);
      const v = await stored(tx);
      expect(await seed(tx, ENTRIES, v)).toEqual({ applied: 3, failed: [] });
      const r1 = await rev(tx);
      expect(await seed(tx, ENTRIES, v)).toEqual({ applied: 0, failed: [] });
      expect(await rev(tx)).toBe(r1);
      const after = await rows(tx);
      expect(after.filter((r) => r.key !== 'zz_e2e_absent')).toEqual(before);
      expect(after.find((r) => r.key === 'zz_e2e_absent')?.value).toBeNull();
      const meta = await tx`select module, scope, value_type, default_value from public.settings where key = 'zz_e2e_false'`;
      expect(meta).toEqual([{ module: 'academy', scope: 'config', value_type: 'bool', default_value: false }]);
    });
  });

  test('a bad entry is reported and skipped; an older registry version is a no-op', async () => {
    await rolledBack(async (tx) => {
      const v = await stored(tx);
      const out = await seed(tx, [...ENTRIES, { key: 'Bad Key', scope: 'config' }], v + 2);
      expect(out).toEqual({ applied: 3, failed: ['Bad Key'] });
      expect(await stored(tx)).toBe(v + 2);
      const older = await seed(tx, [{ ...ENTRIES[0], module: 'changed' }], v + 1);
      expect(older).toEqual({ skipped: 'older_build', stored: v + 2 });
      expect(await tx`select module from public.settings where key = 'zz_e2e_false'`).toEqual([{ module: 'academy' }]);
    });
  });

  test('config_set: optimistic versions, absent row at version 0, JSON null stored, one transaction', async () => {
    await rolledBack(async (tx) => {
      await tx`insert into public.settings (key, value) values ('zz_e2e_false', 'false')`;
      const [cur] = await rows(tx);
      const v0 = Number(cur?.version);
      const stale = await fail(tx, () => set(tx, [{ key: 'zz_e2e_false', value: true, expected_version: v0 + 1000 }]));
      expect(stale).toMatchObject({ code: 'P0409', detail: 'zz_e2e_false' });
      const absent = await fail(tx, () => set(tx, [{ key: 'zz_e2e_new', value: 1, expected_version: 3 }]));
      expect(absent).toMatchObject({ code: 'P0409', detail: 'zz_e2e_new' });
      const half = await fail(tx, () => set(tx, [
        { key: 'zz_e2e_false', value: true, expected_version: v0 },
        { key: 'zz_e2e_new', value: 1, expected_version: 7 },
      ]));
      expect(half.code).toBe('P0409');
      expect((await rows(tx))[0]?.value).toBe(false);
      const r0 = await rev(tx);
      const out = await set(tx, [
        { key: 'zz_e2e_false', value: true, expected_version: v0 },
        { key: 'zz_e2e_new', value: null, expected_version: 0 },
      ]);
      const after = await tx<{ key: string; is_null: boolean; version: string }[]>`select key, value = 'null'::jsonb as is_null,
        version::text as version from public.settings where key in ('zz_e2e_false', 'zz_e2e_new') order by key`;
      expect(after.map((r) => [r.key, r.is_null])).toEqual([['zz_e2e_false', false], ['zz_e2e_new', true]]);
      expect(Number(after[0]?.version)).toBeGreaterThan(v0);
      expect(out).toEqual({ zz_e2e_false: Number(after[0]?.version), zz_e2e_new: Number(after[1]?.version) });
      expect(Number(await rev(tx))).toBeGreaterThan(Number(r0));
    });
  });

  test('a same-value write keeps version and updated_at; a value change moves both', async () => {
    await rolledBack(async (tx) => {
      await tx`insert into public.settings (key, value, updated_at) values ('zz_e2e_false', 'false', now() - interval '1 day')`;
      const [b] = await rows(tx);
      await tx`update public.settings set value = 'false' where key = 'zz_e2e_false'`;
      expect((await rows(tx))[0]).toEqual(b);
      await tx`update public.settings set value = 'true' where key = 'zz_e2e_false'`;
      const [a] = await rows(tx);
      expect(Number(a?.version)).toBeGreaterThan(Number(b?.version));
      expect(a?.updated_at.getTime()).toBeGreaterThan(b?.updated_at.getTime() ?? 0);
    });
  });

  test('anon and signed-in users cannot run the RPCs; only admins read the revision', async () => {
    await rolledBack(async (tx) => {
      const admin = await userId(tx, USERS.admin.email);
      const teacher = await userId(tx, USERS.teacher.email);
      const calls = [() => seed(tx, [], 0), () => set(tx, [])];
      for (const call of calls) {
        expect((await fail(tx, () => as(tx, admin, call))).code).toBe('42501');
        const anon = async () => {
          await tx`set local role anon`;
          return call();
        };
        expect((await fail(tx, anon)).code).toBe('42501');
      }
      expect(await as(tx, teacher, () => tx`select rev from public.settings_revision`)).toHaveLength(0);
      expect(await as(tx, admin, () => tx`select rev from public.settings_revision`)).toHaveLength(1);
      await tx`reset role`;
      const anonRead = async () => {
        await tx`set local role anon`;
        return tx`select rev from public.settings_revision`;
      };
      expect((await fail(tx, anonRead)).code).toBe('42501');
    });
  });
});
