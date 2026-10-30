import { expect, test } from '@playwright/test';
import { guardian, listOf, members, rerunMigration, someone, student, teacher } from '../../support/auto-lists';
import { rolledBack } from '../../support/core/rls';

// The automatic lists' triggers (migration 20261025000710, docs/22 §10): each path that adds a member, and
// nothing ever removed (an ended subscription, an inactive teacher, a deleted student, a hand row). The
// backfill, the attach and the grants: chat-list-auto-rules.sql.spec.ts. Rolled back; database only.

test.describe('automatic chat lists: the triggers (migration 710)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('students: insert or status change to active adds the guardian; pending_renewal and others add nothing', async () => {
    await rolledBack(async (tx) => {
      await rerunMigration(tx);
      const list = await listOf(tx, 'subscribed');
      const trial = await student(tx, { guardian: await guardian(tx, '+966500000721'), status: 'trial' });
      const act = await student(tx, { guardian: await guardian(tx, '+966500000722'), status: 'active' });
      await student(tx, { guardian: await guardian(tx, '+966500000724'), status: 'pending_renewal' });
      expect(await members(tx, list)).toEqual(['+966500000722']);
      await tx`update public.students set status = 'pending_subscription' where id = ${trial}`;
      // Moved to another guardian while not subscribed: nothing.
      await tx`update public.students set guardian_id = ${await guardian(tx, '+966500000725')} where id = ${trial}`;
      await tx`update public.students set status = 'pending_renewal' where id = ${trial}`;
      expect(await members(tx, list)).toEqual(['+966500000722']);
      // A hand removal survives the package ending (active → pending_renewal); a renewal adds it again.
      await tx`delete from public.chat_list_threads where list_id = ${list} and phone_e164 = '+966500000722'`;
      await tx`update public.students set status = 'pending_renewal' where id = ${act}`;
      expect(await members(tx, list)).toEqual([]);
      await tx`update public.students set status = 'active' where id = ${trial}`;
      await tx`update public.students set status = 'active' where id = ${act}`;
      expect(await members(tx, list)).toEqual(['+966500000722', '+966500000725']);
      // Moved to another guardian while active: the new guardian is added, the old one stays.
      const other = await guardian(tx, '+966500000723');
      await tx`update public.students set guardian_id = ${other} where id = ${trial}`;
      expect(await members(tx, list)).toEqual(['+966500000722', '+966500000723', '+966500000725']);
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
      await tx`insert into public.chat_list_threads (list_id, phone_e164, added_by) values (${list}, '+966500000799', ${await someone(tx)})`;
      const g = await guardian(tx, '+966500000741');
      const s = await student(tx, { guardian: g, status: 'active' });
      const idle = await guardian(tx, '+966500000742');
      await student(tx, { guardian: idle, status: 'trial' });
      await tx`update public.guardians set phone_e164 = '+966500000743' where id = ${g}`;
      await tx`update public.guardians set phone_e164 = '+966500000744' where id = ${idle}`;
      await tx`update public.students set status = 'expired' where id = ${s}`;
      await tx`delete from public.students where id = ${s}`;
      expect(await members(tx, list)).toEqual(['+966500000741', '+966500000743', '+966500000799*']);
    });
  });
});
