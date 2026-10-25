import { expect, test } from '@playwright/test';
import { guardian, listOf, members, rerunMigration, someone, student, teacher } from '../support/auto-lists';
import { rolledBack } from '../support/rls';

// Automatic chat lists (migration 20261025000710, docs/22 «القوائم التلقائية»): «مشترك» gains the guardian of
// every active / pending_renewal student, «معلم» every active teacher; backfill + triggers, add only, never
// remove; automatic rows have no added_by; a list without a rule is untouched. This file: the attach, the
// backfill, the cap and the grants; the trigger paths: chat-list-auto-triggers.sql.spec.ts. Rolled back.

test.describe('automatic chat lists (migration 710)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('the rules sit on «مشترك» and «معلم», one list per rule; re-running the migration backfills and is idempotent', async () => {
    await rolledBack(async (tx) => {
      await rerunMigration(tx); // the e2e reset truncates chat_lists: attach / create the two lists again
      const rules = await tx<{ name_key: string; auto_rule: string }[]>`select name_key, auto_rule from public.chat_lists
        where auto_rule is not null order by auto_rule`;
      expect(rules).toEqual([{ name_key: 'مشترك', auto_rule: 'subscribed' }, { name_key: 'معلم', auto_rule: 'teachers' }]);
      const code = await tx
        .savepoint((sp) => sp`insert into public.chat_lists (name, name_key, auto_rule) values ('أخرى', 'اخري', 'teachers')`)
        .then(() => 'ok', (e: { code?: string }) => e.code);
      expect(code).toBe('23505');
      // Rows that exist before the backfill (the triggers off, as on staging before 710).
      await tx`alter table public.students disable trigger students_chat_list_auto_ins`;
      await tx`alter table public.teachers disable trigger teachers_chat_list_auto_ins`;
      await student(tx, { guardian: await guardian(tx, '+966500000701'), status: 'active' });
      await student(tx, { guardian: await guardian(tx, '+966500000702'), status: 'pending_renewal' });
      await student(tx, { guardian: await guardian(tx, '+966500000703'), status: 'expired' });
      await teacher(tx, { phone: '+966500000711', status: 'active' });
      await teacher(tx, { phone: '+966500000712', status: 'inactive' });
      await rerunMigration(tx);
      await rerunMigration(tx);
      expect(await members(tx, await listOf(tx, 'subscribed'))).toEqual(['+966500000701', '+966500000702']);
      expect(await members(tx, await listOf(tx, 'teachers'))).toEqual(['+966500000711']);
      const [n] = await tx<{ n: number }[]>`select count(*)::int as n from public.chat_lists where auto_rule is not null`;
      expect(n?.n).toBe(2);
    });
  });

  test('a renamed «معلم» keeps its rule; a missing list is created with created_by null', async () => {
    await rolledBack(async (tx) => {
      await rerunMigration(tx);
      await tx`delete from public.chat_lists where auto_rule = 'subscribed'`;
      await tx`update public.chat_lists set auto_rule = null where auto_rule = 'teachers'`;
      await rerunMigration(tx);
      const rows = await tx<{ name: string; auto_rule: string; created_by: string | null }[]>`select name, auto_rule, created_by
        from public.chat_lists where auto_rule is not null order by auto_rule`;
      expect(rows).toEqual([
        { name: 'مشترك', auto_rule: 'subscribed', created_by: null },
        { name: 'معلم', auto_rule: 'teachers', created_by: null },
      ]);
    });
  });

  test('staging: an existing «مُشترك» with hand members gets the rule; its hand rows keep added_by', async () => {
    await rolledBack(async (tx) => {
      await rerunMigration(tx);
      await tx`delete from public.chat_lists where auto_rule is not null`;
      const [own] = await tx<{ id: string }[]>`insert into public.chat_lists (name, name_key, created_by)
        values ('مُشترك', 'مشترك', ${await someone(tx)}) returning id`;
      if (!own) throw new Error('no list');
      await tx`insert into public.chat_list_threads (list_id, phone_e164, added_by) values (${own.id}, '+966500000761', ${await someone(tx)})`;
      await student(tx, { guardian: await guardian(tx, '+966500000762'), status: 'active' });
      await rerunMigration(tx);
      expect(await listOf(tx, 'subscribed')).toBe(own.id);
      expect(await members(tx, own.id)).toEqual(['+966500000761*', '+966500000762']);
    });
  });

  test('at the 30-list cap with «معلم» missing, the migration stops with an error instead of a silent no-op', async () => {
    await rolledBack(async (tx) => {
      await tx`delete from public.chat_lists`;
      await tx`insert into public.chat_lists (name, name_key) select 'ق' || i, 'ق' || i from generate_series(1, 30) as i`;
      const code = await tx.savepoint((sp) => rerunMigration(sp)).then(() => 'ok', (e: { code?: string }) => e.code);
      expect(code).toBe('23514');
    });
  });

  test('a list without a rule is untouched; an invalid phone is skipped; RLS and grants stay', async () => {
    await rolledBack(async (tx) => {
      await rerunMigration(tx);
      const [plain] = await tx<{ id: string }[]>`insert into public.chat_lists (name, name_key) values ('عادية', 'عاديه') returning id`;
      await student(tx, { guardian: await guardian(tx, '+966500000751'), status: 'active' });
      await teacher(tx, { phone: '+966500000752', status: 'active' });
      await tx`select public.chat_list_auto_add('subscribed', '0500000753')`;
      await tx`select public.chat_list_auto_add('subscribed', null)`;
      expect(await members(tx, plain?.id ?? '')).toEqual([]);
      expect(await members(tx, await listOf(tx, 'subscribed'))).toEqual(['+966500000751']);
      const fns = ['chat_list_auto_add(text, text)', 'students_chat_list_auto()', 'teachers_chat_list_auto()', 'guardians_chat_list_auto()'];
      for (const fn of fns) {
        const [rights] = await tx<{ auth: boolean; anon: boolean }[]>`select
          has_function_privilege('authenticated', ${`public.${fn}`}, 'execute') as auth,
          has_function_privilege('anon', ${`public.${fn}`}, 'execute') as anon`;
        expect(rights, fn).toEqual({ auth: false, anon: false });
      }
      const [rls] = await tx<{ on: boolean }[]>`select relrowsecurity as on from pg_class where oid = 'public.chat_list_threads'::regclass`;
      expect(rls?.on).toBe(true);
    });
  });
});
