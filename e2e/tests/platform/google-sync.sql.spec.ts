import { expect, test } from '@playwright/test';
import { as, rolledBack, userId, type Tx } from '../../support/core/rls';
import { USERS } from '../../support/core/users';

// Migrations 530–531 (docs/24 §2.2, §3) against the real database, rolled back: the platform-origin
// predicate, the producers, the reconcile's idempotency, gone-handling and RLS.

const code = (tx: Tx, q: () => Promise<unknown>) => tx.savepoint(q).then(() => 'ok', (e: { code?: string }) => e.code);

async function seed(tx: Tx) {
  const [t] = await tx<{ id: string }[]>`select t.id from public.teachers t join auth.users u on u.id = t.profile_id where u.email = ${USERS.teacher.email}`;
  if (!t) throw new Error('e2e teacher missing');
  const [run] = await tx<{ id: string }[]>`insert into public.import_runs (target) values ('local') returning id`;
  const rule = async () => (await tx<{ id: string }[]>`insert into public.schedule_rules (teacher_id, duration_min, start_time_local, tz, byday, starts_on)
    values (${t.id}, 45, '17:00', 'Asia/Riyadh', '{0}', current_date) returning id`)[0]?.id ?? '';
  const imported = async (table: string, id: string) => tx`insert into public.import_items (entity, natural_key, target_table, target_id, payload_hash, first_run_id, last_run_id)
    values (${table}, ${`e2e:${id}`}, ${table}, ${id}, 'h', ${run?.id ?? ''}, ${run?.id ?? ''})`;
  const lesson = async (input: { ruleId?: string; inDays: number }) => (await tx<{ id: string }[]>`insert into public.lessons (rule_id, teacher_id, starts_at, ends_at)
    values (${input.ruleId ?? null}, ${t.id}, now() + make_interval(days => ${input.inDays}), now() + make_interval(days => ${input.inDays}) + interval '45 minutes') returning id`)[0]?.id ?? '';
  return { teacherId: t.id, rule, imported, lesson };
}
const on = (tx: Tx) => tx`insert into public.settings (key, value) values ('google_sync_enabled', 'true') on conflict (key) do update set value = 'true'`;
const items = (tx: Tx, id: string) => tx<{ kind: string; state: string; google_id: string | null }[]>`
  select kind, state, google_id from public.google_sync_items where subject_id = ${id} order by kind`;

test.describe('Google sync outbox (migrations 530–531)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('defaults: OFF, dry_run, 60 days; nothing is queued while OFF', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      await tx`delete from public.settings where key like 'google\_%'`;
      expect(await tx`select public.google_sync_on() as on`).toEqual([{ on: false }]);
      expect(await tx`select public.google_sync_window_days() as d`).toEqual([{ d: 60 }]);
      const id = await s.lesson({ inDays: 1 });
      expect(await items(tx, id)).toEqual([]);
    });
  });

  test('platform-origin only: an imported lesson and every occurrence of an imported rule are never queued', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      await on(tx);
      const platformRule = await s.rule();
      const sheetRule = await s.rule();
      await s.imported('schedule_rules', sheetRule);
      const platform = await s.lesson({ ruleId: platformRule, inDays: 1 });
      const fromSheetRule = await s.lesson({ ruleId: sheetRule, inDays: 2 });
      const oneOff = await s.lesson({ inDays: 3 });
      expect((await items(tx, platform)).map((i) => i.kind)).toEqual(['teacher_event', 'main_event']);
      expect(await items(tx, fromSheetRule)).toEqual([]);
      expect((await items(tx, oneOff)).length).toBe(2);
      await s.imported('lessons', oneOff);
      const origin = await tx<{ id: string }[]>`select id from public.v_platform_origin_lessons where id in (${platform}, ${fromSheetRule}, ${oneOff})`;
      expect(origin.map((r) => r.id)).toEqual([platform]);
    });
  });

  test('outside the window nothing is queued; the reconcile is idempotent and never revives a gone row', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      const early = await s.lesson({ inDays: 1 });
      await on(tx);
      const far = await s.lesson({ inDays: 90 });
      expect(await items(tx, far)).toEqual([]);
      expect(await items(tx, early)).toEqual([]);
      const [first] = await tx<{ n: number }[]>`select public.google_sync_reconcile() as n`;
      expect(first?.n).toBeGreaterThanOrEqual(2);
      expect(await tx`select public.google_sync_reconcile() as n`).toEqual([{ n: 0 }]);
      await tx`update public.google_sync_items set state = 'gone', google_id = 'ev-1' where subject_id = ${early} and kind = 'main_event'`;
      await tx`update public.google_sync_items set state = 'synced' where subject_id = ${early} and kind = 'teacher_event'`;
      await tx`select public.google_sync_reconcile()`;
      expect(await items(tx, early)).toEqual([{ kind: 'teacher_event', state: 'pending', google_id: null }, { kind: 'main_event', state: 'gone', google_id: 'ev-1' }]);
      await tx`update public.lessons set status = 'cancelled_by_admin' where id = ${early}`;
      expect((await items(tx, early))[1]).toEqual({ kind: 'main_event', state: 'pending', google_id: null });
    });
  });

  test('a claimed row has a token; a second claim finds nothing', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      await on(tx);
      await s.lesson({ inDays: 1 });
      const a = await tx<{ claim_token: string }[]>`select claim_token from public.google_sync_claim(100, now() - interval '10 minutes')`;
      expect(a.length).toBeGreaterThanOrEqual(2);
      expect(a.every((r) => r.claim_token)).toBe(true);
      expect(await tx`select * from public.google_sync_claim(100, now() - interval '10 minutes')`).toHaveLength(0);
    });
  });

  test('a change while a worker holds the row marks it dirty and keeps the claim and the id', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      await on(tx);
      const lesson = await s.lesson({ inDays: 1 });
      await tx`select * from public.google_sync_claim(100, now() - interval '10 minutes')`;
      await tx`update public.google_sync_items set google_id = 'ev-held' where subject_id = ${lesson}`;
      await tx`update public.lessons set status = 'cancelled_by_admin' where id = ${lesson}`;
      const rows = await tx<{ dirty: boolean; claim_token: string | null; google_id: string }[]>`
        select dirty, claim_token, google_id from public.google_sync_items where subject_id = ${lesson}`;
      expect(rows.every((r) => r.dirty && r.claim_token !== null && r.google_id === 'ev-held')).toBe(true);
    });
  });

  test('RLS: a teacher reads no row and runs no function; an admin reads', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      await on(tx);
      const lesson = await s.lesson({ inDays: 1 });
      const teacher = await userId(tx, USERS.teacher.email);
      const admin = await userId(tx, USERS.admin.email);
      expect(await as(tx, teacher, () => tx`select id from public.google_sync_items`)).toHaveLength(0);
      expect(await as(tx, teacher, () => tx`select * from public.google_account`)).toHaveLength(0);
      expect(await code(tx, () => as(tx, teacher, () => tx`select public.google_token_read()`))).toBe('42501');
      expect(await code(tx, () => as(tx, admin, () => tx`select public.google_sync_reconcile()`))).toBe('42501');
      expect(await code(tx, () => as(tx, admin, () => tx`insert into public.google_sync_items (kind, subject_id) values ('main_event', ${lesson})`))).toBe('42501');
      expect((await as(tx, admin, () => tx`select id from public.google_sync_items where subject_id = ${lesson}`)).length).toBe(2);
    });
  });
});
