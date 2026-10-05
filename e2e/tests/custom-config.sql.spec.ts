import { expect, test } from '@playwright/test';
import { as, rolledBack, userId, type Tx } from '../support/rls';
import { USERS } from '../support/users';

// Migration 20261005000250: custom_config (RLS, key and size checks) and prune_activity_log()
// reading settings.activity_retention_days.

const refused = (tx: Tx, uid: string, q: () => Promise<unknown>) =>
  tx.savepoint(() => as(tx, uid, q)).then(() => 'allowed', (e: { code?: string }) => e.code);

async function logAt(tx: Tx, daysAgo: number, route: string) {
  await tx`insert into public.activity_log (at, action, method, route, status)
    values (now() - make_interval(days => ${daysAgo}), 'e2e.prune', 'POST', ${route}, 200)`;
}
const left = (tx: Tx) =>
  tx<{ route: string }[]>`select route from public.activity_log where action = 'e2e.prune' order by route`;

test.describe('custom_config (migration 250)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('an admin reads and writes; a teacher sees nothing and writes nothing', async () => {
    await rolledBack(async (tx) => {
      const admin = await userId(tx, USERS.admin.email);
      const teacher = await userId(tx, USERS.teacher.email);
      await as(tx, admin, () => tx`insert into public.custom_config (key, value, is_public) values ('e2e.promo', '"hi"', true)`);
      const rows = (uid: string) => as(tx, uid, () => tx`select key from public.custom_config where key = 'e2e.promo'`);
      expect(await rows(admin)).toHaveLength(1);
      expect(await rows(teacher)).toHaveLength(0);
      expect(await refused(tx, teacher, () => tx`insert into public.custom_config (key, value) values ('e2e.x', '1')`)).toBe('42501');
    });
  });

  test('the key shape and the 8 KB limit are enforced by the table', async () => {
    await rolledBack(async (tx) => {
      const bad = (key: string, value: string) =>
        tx.savepoint(() => tx`insert into public.custom_config (key, value) values (${key}, ${value}::jsonb)`).then(() => 'ok', (e: { code?: string }) => e.code);
      expect(await bad('Bad Key', '1')).toBe('23514');
      expect(await bad('a', '1')).toBe('23514');
      expect(await bad('good.key', JSON.stringify('x'.repeat(9000)))).toBe('23514');
      expect(await bad('good.key', '1')).toBe('ok');
    });
  });
});

test.describe('prune_activity_log reads activity_retention_days (migration 250)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('180 days without a setting; the stored number when set; a bad value falls back to 180', async () => {
    await rolledBack(async (tx) => {
      await tx`delete from public.settings where key = 'activity_retention_days'`;
      await logAt(tx, 200, 'r200');
      await logAt(tx, 100, 'r100');
      await logAt(tx, 20, 'r020');
      await tx`select public.prune_activity_log()`;
      expect((await left(tx)).map((r) => r.route)).toEqual(['r020', 'r100']);

      await tx`insert into public.settings (key, value) values ('activity_retention_days', '30'::jsonb)`;
      await tx`select public.prune_activity_log()`;
      expect((await left(tx)).map((r) => r.route)).toEqual(['r020']);

      await tx`update public.settings set value = '"x"'::jsonb where key = 'activity_retention_days'`;
      await logAt(tx, 200, 'r200b');
      await logAt(tx, 100, 'r100b');
      await tx`select public.prune_activity_log()`;
      expect((await left(tx)).map((r) => r.route)).toEqual(['r020', 'r100b']);
    });
  });
});
