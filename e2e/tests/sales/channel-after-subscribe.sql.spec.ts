import { expect, test } from '@playwright/test';
import { as, family, rolledBack, userId, type Tx } from '../../support/core/rls';
import { USERS } from '../../support/core/users';
import { assistant, student } from '../../support/sales/assistant';

// Migrations 20261029000971–972: the student channel opens once the student is subscribed
// (past the trial) AND has an assigned teacher; before that neither the teacher nor the family
// reads a message (RLS, also what Realtime checks per subscriber); monitors always read. The
// family side is the guardian's login and the student's own login, a child's too (migration
// 20261116000100_child_chat); the assistant writes too (20261116000200), and only the one
// assistant in the chat's seat reads it (20261117090200). The family reads only while
// settings.family_chat_enabled is on (20261117090400), so the seed turns it on.
// Rolled back; the e2e stack has no Realtime service, so the publication step is not run here.

async function login(tx: Tx, input: { tag: string; role: 'guardian' | 'student' }): Promise<string> {
  const [u] = await tx<{ id: string }[]>`insert into auth.users (id, email)
    values (gen_random_uuid(), ${`${input.tag}@e2e.local`}) returning id`;
  if (!u) throw new Error('auth user not written');
  await tx`insert into public.profiles (id, role, full_name) values (${u.id}, ${input.role}::public.user_role, ${input.tag})`;
  return u.id;
}

async function seed(tx: Tx) {
  const teacher = await userId(tx, USERS.teacher.email);
  const [t] = await tx<{ id: string }[]>`select id from public.teachers where profile_id = ${teacher}`;
  if (!t) throw new Error('teacher row missing (global setup)');
  const student = await family(tx, { phone: '+966500000961', teacherId: t.id, status: 'trial' });
  const guardian = await login(tx, { tag: 'ch961-guardian', role: 'guardian' });
  const own = await login(tx, { tag: 'ch961-student', role: 'student' });
  await tx`update public.guardians set profile_id = ${guardian} where phone_e164 = '+966500000961'`;
  await tx`update public.students set profile_id = ${own} where id = ${student}`;
  const [ch] = await tx<{ id: string }[]>`select id from public.student_channels where student_id = ${student}`;
  if (!ch) throw new Error('channel not opened by the trigger');
  await tx`insert into public.channel_messages (channel_id, sender_role, body) values (${ch.id}, 'guardian', 'السلام عليكم')`;
  await familyChat(tx, true);
  return {
    teacher,
    teacherId: t.id,
    student,
    guardian,
    own,
    admin: await userId(tx, USERS.admin.email),
  };
}

// A boolean parameter would reach jsonb as the string "true" (settings_kind refuses it): literals.
const familyChat = (tx: Tx, on: boolean) =>
  on
    ? tx`insert into public.settings (key, value) values ('family_chat_enabled', 'true')
        on conflict (key) do update set value = 'true'`
    : tx`update public.settings set value = 'false' where key = 'family_chat_enabled'`;

const reads = (tx: Tx, uid: string) =>
  as(tx, uid, async () => (await tx<{ id: string }[]>`select id from public.channel_messages where body = 'السلام عليكم'`).length);

test.describe('student channel opens after the subscription (20261029000971–972)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('closed during the trial even with the trial teacher; open once active; closed again without a teacher', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      expect([
        await reads(tx, s.teacher),
        await reads(tx, s.guardian),
        await reads(tx, s.admin),
      ]).toEqual([0, 0, 1]);
      await tx`update public.students set status = 'active' where id = ${s.student}`;
      expect([await reads(tx, s.teacher), await reads(tx, s.guardian)]).toEqual([1, 1]);
      expect(await tx`select 1 from public.teacher_channel_student_ids(${s.teacherId}) id where id = ${s.student}`).toHaveLength(1);
      await tx`update public.students set teacher_id = null where id = ${s.student}`;
      expect([
        await reads(tx, s.teacher),
        await reads(tx, s.guardian),
        await reads(tx, s.admin),
      ]).toEqual([0, 0, 1]);
    });
  });

  test('the student’s own login reads once open, a child’s too (owner 2026-11-16)', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      expect(await reads(tx, s.own)).toBe(0);
      await tx`update public.students set status = 'active' where id = ${s.student}`;
      expect(await reads(tx, s.own)).toBe(1);
    });
  });

  test('family chat off (20261117090400): the family reads nothing, staff do', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      await tx`update public.students set status = 'active' where id = ${s.student}`;
      await familyChat(tx, false);
      const family = [await reads(tx, s.guardian), await reads(tx, s.own)];
      const staff = [await reads(tx, s.teacher), await reads(tx, s.admin)];
      expect([...family, ...staff]).toEqual([0, 0, 1, 1]);
    });
  });

  test('the owning assistant writes too: sender_role sales passes the check, another role does not (20261116000200)', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      const insert = (role: string) => tx`insert into public.channel_messages (channel_id, sender_role, body)
        select id, ${role}::text, 'موعد التجديد غدًا' from public.student_channels where student_id = ${s.student}`;
      await insert('sales');
      await tx`savepoint other_role`;
      await expect(insert('admin')).rejects.toThrow(/channel_messages_sender_role_check/);
      await tx`rollback to savepoint other_role`;
      const sales = await tx`select 1 from public.channel_messages where sender_role = 'sales' and body = 'موعد التجديد غدًا'`;
      expect(sales).toHaveLength(1);
    });
  });

  test('one assistant seat: a new student seats its bringer; only the holder reads (20261117090200)', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      const bringer = await assistant(tx, 'ch961-sales-a');
      const other = await assistant(tx, 'ch961-sales-b');
      const brought = await student(tx, { phone: '+966500000962', broughtBy: bringer });
      const [seat] = await tx<{ assistant_id: string | null }[]>`select assistant_id
        from public.student_channels where student_id = ${brought}`;
      expect(seat?.assistant_id).toBe(bringer);
      expect(await reads(tx, other)).toBe(0);
      await tx`update public.student_channels set assistant_id = ${other} where student_id = ${s.student}`;
      expect([await reads(tx, other), await reads(tx, bringer)]).toEqual([1, 0]);
    });
  });

  test('assign_student_teacher: an audit row on a change, nothing when unchanged (even inactive), an inactive new teacher refused', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      const audits = async () =>
        (await tx`select 1 from public.audit_log where entity = 'students' and entity_id = ${s.student} and action = 'teacher_assign'`).length;
      const [same] = await tx<{ r: boolean }[]>`select public.assign_student_teacher(${s.student}, ${s.teacherId}, ${s.admin}) as r`;
      expect([same?.r, await audits()]).toEqual([false, 0]);
      await tx`update public.students set teacher_id = null where id = ${s.student}`;
      const [moved] = await tx<{ r: boolean }[]>`select public.assign_student_teacher(${s.student}, ${s.teacherId}, ${s.admin}) as r`;
      expect([moved?.r, await audits()]).toEqual([true, 1]);
      await tx`update public.teachers set status = 'inactive' where id = ${s.teacherId}`;
      const [kept] = await tx<{ r: boolean }[]>`select public.assign_student_teacher(${s.student}, ${s.teacherId}, ${s.admin}) as r`;
      expect(kept?.r).toBe(false);
      await tx`update public.students set teacher_id = null where id = ${s.student}`;
      await tx`savepoint inactive`;
      await expect(tx`select public.assign_student_teacher(${s.student}, ${s.teacherId}, ${s.admin})`).rejects.toThrow(/teacher_not_found/);
      await tx`rollback to savepoint inactive`;
    });
  });
});
