import { expect, test } from '@playwright/test';
import postgres from 'postgres';
import { as, rolledBack, userId, type Tx } from '../../support/core/rls';
import { USERS } from '../../support/core/users';

// Managed short links (migrations 20261117130100-130300, docs/19): RLS on with no client access,
// the link's users and visits go with it (cascade), one visit row per distinct visitor, and the
// atomic visit write holds max_users. Rolled back; database only.

const insertLink = (tx: Tx, code: string, maxUsers: number | null) => tx`
  insert into public.short_links (code, target_url, kind, subject, title, expires_at, max_users)
  values (${code}, 'https://app.example.com/x', 'managed', ${code}, 'رابط', now() + interval '7 days',
          ${maxUsers})`;
const visit = (tx: Tx, code: string, phone: string) =>
  tx<
    { r: string }[]
  >`select public.short_link_record_visit(${code}, null, ${phone}, null, null) as r`;
/** The SQLSTATE of a failed statement ('ok' when it ran), inside a savepoint. */
const errCode = (tx: Tx, q: () => Promise<unknown>) =>
  tx.savepoint(q).then(
    () => 'ok',
    (e: unknown) => (e instanceof postgres.PostgresError ? e.code : 'error'),
  );

test.describe('managed short links in the database', () => {
  test.beforeEach(() =>
    test.skip(test.info().project.name !== 'desktop', 'database only: one run'),
  );

  test('RLS is on for the three tables and a signed-in client reads nothing', async () => {
    await rolledBack(async (tx) => {
      const rows = await tx<
        { relname: string; rls: boolean }[]
      >`select relname, relrowsecurity as rls
        from pg_class where relname in ('short_links', 'short_link_users', 'short_link_visits')
        order by relname`;
      expect(rows.every((r) => r.rls)).toBe(true);
      expect(rows).toHaveLength(3);
      await insertLink(tx, 'RlsTest001', null);
      const admin = await userId(tx, USERS.admin.email);
      const denied = await errCode(tx, () =>
        as(tx, admin, () => tx`select * from public.short_link_users`),
      );
      expect(denied).toBe('42501');
    });
  });

  test('deleting a link deletes its users and visits (cascade)', async () => {
    await rolledBack(async (tx) => {
      await insertLink(tx, 'Cascade001', null);
      await tx`insert into public.short_link_users (code, phone_e164) values ('Cascade001', '+201000000901')`;
      await visit(tx, 'Cascade001', '+201000000901');
      await tx`delete from public.short_links where code = 'Cascade001'`;
      const [n] = await tx<{ u: number; v: number }[]>`select
        (select count(*)::int from public.short_link_users where code = 'Cascade001') as u,
        (select count(*)::int from public.short_link_visits where code = 'Cascade001') as v`;
      expect(n).toEqual({ u: 0, v: 0 });
    });
  });

  test('one visit row per distinct visitor; the limit stops only NEW visitors', async () => {
    await rolledBack(async (tx) => {
      await insertLink(tx, 'Limit00001', 1);
      expect((await visit(tx, 'Limit00001', '+201000000911'))[0]?.r).toBe('recorded');
      expect((await visit(tx, 'Limit00001', '+201000000911'))[0]?.r).toBe('recorded');
      expect((await visit(tx, 'Limit00001', '+201000000912'))[0]?.r).toBe('limit_reached');
      const [v] = await tx<
        { n: number; opens: number }[]
      >`select count(*)::int as n, max(opens) as opens
        from public.short_link_visits where code = 'Limit00001'`;
      expect(v).toEqual({ n: 1, opens: 2 });
      const dup = await errCode(
        tx,
        () => tx`insert into public.short_link_visits (code, phone_e164)
        values ('Limit00001', '+201000000911')`,
      );
      expect(dup).toBe('23505');
    });
  });

  test('a user row needs a profile or a phone; a managed link needs a title and an expiry', async () => {
    await rolledBack(async (tx) => {
      await insertLink(tx, 'Checks0001', null);
      expect(
        await errCode(
          tx,
          () => tx`insert into public.short_link_users (code) values ('Checks0001')`,
        ),
      ).toBe('23514');
      const noTitle = () => tx`insert into public.short_links (code, target_url, kind, subject)
        values ('Checks0002', 'https://app.example.com/x', 'managed', 'Checks0002')`;
      expect(await errCode(tx, noTitle)).toBe('23514');
      const revoked =
        await tx`update public.short_links set status = 'revoked' where code = 'Checks0001'`;
      expect(revoked.count).toBe(1);
      expect((await visit(tx, 'Checks0001', '+201000000921'))[0]?.r).toBe('gone');
    });
  });
});
