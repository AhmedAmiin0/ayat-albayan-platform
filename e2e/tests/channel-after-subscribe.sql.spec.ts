import { expect, test } from '@playwright/test';
import { as, family, rolledBack, userId, type Tx } from '../support/rls';
import { USERS } from '../support/users';

// Migrations 20261029000961–962 (owner 2026-10-29): the student channel opens once the student is
// subscribed (past the trial) AND has an assigned teacher; before that neither the teacher nor the family
// reads a message (RLS, also what Realtime checks per subscriber); monitors always read. The family side is
// the guardian's login, or the student's own login only when they are their own contact (contact_is_self).
// Rolled back; the e2e stack has no Realtime service, so the publication step is not exercised here.

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
  return { teacher, teacherId: t.id, student, guardian, own, admin: await userId(tx, USERS.admin.email) };
}

const reads = (tx: Tx, uid: string) =>
  as(tx, uid, async () => (await tx<{ id: string }[]>`select id from public.channel_messages where body = 'السلام عليكم'`).length);

test.describe('student channel opens after the subscription (20261029000961–962)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('closed during the trial even with the trial teacher; open once active; closed again without a teacher', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      expect([await reads(tx, s.teacher), await reads(tx, s.guardian), await reads(tx, s.admin)]).toEqual([0, 0, 1]);
      await tx`update public.students set status = 'active' where id = ${s.student}`;
      expect([await reads(tx, s.teacher), await reads(tx, s.guardian)]).toEqual([1, 1]);
      expect(await tx`select 1 from public.teacher_channel_student_ids(${s.teacherId}) id where id = ${s.student}`).toHaveLength(1);
      await tx`update public.students set teacher_id = null where id = ${s.student}`;
      expect([await reads(tx, s.teacher), await reads(tx, s.guardian), await reads(tx, s.admin)]).toEqual([0, 0, 1]);
    });
  });

  test('a child’s own login never reads; a student who is their own contact does', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      await tx`update public.students set status = 'active' where id = ${s.student}`;
      expect(await reads(tx, s.own)).toBe(0);
      await tx`update public.students set contact_is_self = true where id = ${s.student}`;
      expect(await reads(tx, s.own)).toBe(1);
    });
  });

  test('assign_student_teacher: an audit row on a change, nothing when unchanged, an inactive teacher refused', async () => {
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
      await tx`savepoint inactive`;
      await expect(tx`select public.assign_student_teacher(${s.student}, ${s.teacherId}, ${s.admin})`).rejects.toThrow(/teacher_not_found/);
      await tx`rollback to savepoint inactive`;
    });
  });
});
