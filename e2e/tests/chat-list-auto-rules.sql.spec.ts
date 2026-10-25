import { expect, test } from '@playwright/test';
import { guardian, listOf, members, rerunMigration, student, teacher } from '../support/auto-lists';
import { rolledBack } from '../support/rls';

// Automatic chat lists (migration 20261025000710, docs/22 «القوائم التلقائية»): «مشترك» gains the guardian of
// every active / pending_renewal student, «معلم» every active teacher; backfill + triggers, add only, never
// remove; automatic rows have no added_by; a list without a rule is untouched. Rolled back; database only.

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

  test('students: insert or status change to active / pending_renewal adds the guardian; other statuses add nothing', async () => {
    await rolledBack(async (tx) => {
      await rerunMigration(tx);
      const list = await listOf(tx, 'subscribed');
      const trial = await student(tx, { guardian: await guardian(tx, '+966500000721'), status: 'trial' });
      await student(tx, { guardian: await guardian(tx, '+966500000722'), status: 'active' });
      expect(await members(tx, list)).toEqual(['+966500000722']);
      await tx`update public.students set status = 'pending_subscription' where id = ${trial}`;
      expect(await members(tx, list)).toEqual(['+966500000722']);
      await tx`update public.students set status = 'pending_renewal' where id = ${trial}`;
      expect(await members(tx, list)).toEqual(['+966500000721', '+966500000722']);
      // Moved to another guardian while active: the new guardian is added, the old one stays.
      const other = await guardian(tx, '+966500000723');
      await tx`update public.students set guardian_id = ${other} where id = ${trial}`;
      expect(await members(tx, list)).toEqual(['+966500000721', '+966500000722', '+966500000723']);
    });
  });

  test('teachers: active insert, activation and a phone change add; nothing is ever removed', async () => {
    await rolledBack(async (tx) => {
      await rerunMigration(tx);
      const list = await listOf(tx, 'teachers');
      const off = await teacher(tx, { phone: '+966500000731', status: 'inactive' });
      const on = await teacher(tx, { phone: '+966500000732', status: 'active' });
      await teacher(tx, { phone: null, status: 'active' });
      expect(await members(tx, list)).toEqual(['+966500000732']);
      await tx`update public.teachers set status = 'active' where id = ${off}`;
      await tx`update public.teachers set phone_e164 = '+966500000733' where id = ${on}`;
      await tx`update public.teachers set status = 'inactive' where id = ${on}`;
      expect(await members(tx, list)).toEqual(['+966500000731', '+966500000732', '+966500000733']);
    });
  });

  test('guardians: a new phone is added only while a student is subscribed; ends, deletes and hand rows stay', async () => {
    await rolledBack(async (tx) => {
      await rerunMigration(tx);
      const list = await listOf(tx, 'subscribed');
      const [hand] = await tx<{ id: string }[]>`select id from public.profiles limit 1`;
      await tx`insert into public.chat_list_threads (list_id, phone_e164, added_by) values (${list}, '+966500000799', ${hand?.id ?? null})`;
      const g = await guardian(tx, '+966500000741');
      const s = await student(tx, { guardian: g, status: 'active' });
      const idle = await guardian(tx, '+966500000742');
      await student(tx, { guardian: idle, status: 'trial' });
      await tx`update public.guardians set phone_e164 = '+966500000743' where id = ${g}`;
      await tx`update public.guardians set phone_e164 = '+966500000744' where id = ${idle}`;
      await tx`update public.students set status = 'expired' where id = ${s}`;
      await tx`delete from public.students where id = ${s}`;
      const rows = await tx<{ phone_e164: string }[]>`select phone_e164 from public.chat_list_threads
        where list_id = ${list} and phone_e164 like '+9665000007%' order by phone_e164`;
      expect(rows.map((r) => r.phone_e164)).toEqual(['+966500000741', '+966500000743', '+966500000799']);
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
      const [rights] = await tx<{ auth: boolean; anon: boolean; rls: boolean }[]>`select
        has_function_privilege('authenticated', 'public.chat_list_auto_add(text, text)', 'execute') as auth,
        has_function_privilege('anon', 'public.chat_list_auto_add(text, text)', 'execute') as anon,
        (select relrowsecurity from pg_class where oid = 'public.chat_list_threads'::regclass) as rls`;
      expect(rights).toEqual({ auth: false, anon: false, rls: true });
    });
  });
});
