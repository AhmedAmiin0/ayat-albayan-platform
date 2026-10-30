import { expect, test } from '@playwright/test';
import { as, rolledBack, userId } from '../../support/rls';
import { USERS } from '../../support/users';

// Chat lists «القوائم» (docs/22 §1, migrations 520–521): RLS on both tables (the admin reads, nobody
// writes but the API), v_list_threads for the service role only, one name per normalised key, at most 30 lists, members are E.164 numbers, and
// deleting a list removes its memberships only. inbox.lists is seeded for the system admin and sales.
// Rolled back; database only.

const PHONE = '+966500000520';

test.describe('chat lists in the database (migrations 520, 521)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('RLS is on; authenticated users cannot write, a teacher reads nothing', async () => {
    await rolledBack(async (tx) => {
      const rls = await tx<{ relname: string; on: boolean }[]>`select relname, relrowsecurity as on from pg_class
        where relname in ('chat_lists', 'chat_list_threads') and relnamespace = 'public'::regnamespace order by relname`;
      expect(rls).toEqual([{ relname: 'chat_list_threads', on: true }, { relname: 'chat_lists', on: true }]);
      const [view] = await tx<{ anon: boolean; auth: boolean }[]>`select has_table_privilege('anon', 'public.v_list_threads', 'select') as anon,
        has_table_privilege('authenticated', 'public.v_list_threads', 'select') as auth`;
      expect(view).toEqual({ anon: false, auth: false });
      await tx`insert into public.chat_lists (name, name_key) values ('قائمة RLS', 'قائمه rls')`;
      const teacher = await userId(tx, USERS.teacher.email);
      const seen = await as(tx, teacher, () => tx<{ n: number }[]>`select count(*)::int as n from public.chat_lists`);
      expect(seen[0]?.n).toBe(0);
      const code = await tx
        .savepoint((sp) => as(sp, teacher, () => sp`insert into public.chat_lists (name, name_key) values ('س', 'س')`))
        .then(() => 'ok', (e: { code?: string }) => e.code);
      expect(code).toBe('42501');
    });
  });

  test('a list delete cascades to its memberships only; names are unique by key; phones are E.164', async () => {
    await rolledBack(async (tx) => {
      const code = (q: () => Promise<unknown>) => tx.savepoint(q).then(() => 'ok', (e: { code?: string }) => e.code);
      const [list] = await tx<{ id: string }[]>`insert into public.chat_lists (name, name_key) values ('بانتظار الدفع', 'بانتظار الدفع') returning id`;
      if (!list) throw new Error('list not written');
      await tx`insert into public.messages (direction, phone_e164, body, status) values ('inbound', ${PHONE}, 'السلام عليكم', 'delivered')`;
      await tx`insert into public.chat_list_threads (list_id, phone_e164) values (${list.id}, ${PHONE})`;
      expect(await code(() => tx`insert into public.chat_list_threads (list_id, phone_e164) values (${list.id}, '0500000520')`)).toBe('23514');
      expect(await code(() => tx`insert into public.chat_lists (name, name_key) values ('بإنتظار الدفع', 'بانتظار الدفع')`)).toBe('23505');
      expect(await code(() => tx`insert into public.chat_lists (name, name_key) values (' مسافة', ' مسافة')`)).toBe('23514');
      const [shown] = await tx<{ n: number }[]>`select count(*)::int as n from public.v_list_threads where list_id = ${list.id}`;
      expect(shown?.n).toBe(1);
      await tx`delete from public.chat_lists where id = ${list.id}`;
      const [left] = await tx<{ members: number; messages: number }[]>`select
        (select count(*)::int from public.chat_list_threads where list_id = ${list.id}) as members,
        (select count(*)::int from public.messages where phone_e164 = ${PHONE}) as messages`;
      expect(left).toEqual({ members: 0, messages: 1 });
    });
  });

  test('at most 30 lists (the cap trigger), and inbox.lists is seeded for admin and sales only', async () => {
    await rolledBack(async (tx) => {
      await tx`delete from public.chat_lists`;
      await tx`insert into public.chat_lists (name, name_key) select 'ق' || i, 'ق' || i from generate_series(1, 30) as i`;
      const over = await tx.savepoint((sp) => sp`insert into public.chat_lists (name, name_key) values ('ق31', 'ق31')`).then(
        () => 'ok',
        (e: { code?: string }) => e.code,
      );
      expect(over).toBe('23514');
      const roles = await tx<{ key: string }[]>`select r.key from public.role_permissions p join public.roles r on r.id = p.role_id
        where p.permission = 'inbox.lists' and r.is_system order by r.key`;
      expect(roles.map((r) => r.key)).toEqual(['admin', 'sales']);
    });
  });
});
