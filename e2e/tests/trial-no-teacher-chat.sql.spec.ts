import { expect, test } from '@playwright/test';
import { as, family, rolledBack, userId, type Tx } from '../support/rls';
import { USERS } from '../support/users';

// Owner, 2026-10-11: «for the trial session, students and teachers cannot chat together; they will
// need the sales to manage between them, or the system». Migration 20261007000001 against the real
// database, rolled back: a trial family leaves «أبرار»'s chat scope (the function, my_thread_phones
// and the messages policy), a family with an active child stays, her own chat stays, and she still
// reads her trial student's row (teacher_student_ids is unchanged).

const PHONE = { trial: '+966500700001', mixed: '+966500700002', active: '+966500700003', own: '+966500700004' };

async function seed(tx: Tx) {
  const [abrar] = await tx<{ id: string }[]>`update public.teachers set phone_e164 = ${PHONE.own}
    where profile_id = ${await userId(tx, USERS.teacher.email)} returning id`;
  if (!abrar) throw new Error('teacher missing');
  const trialKid = await family(tx, { phone: PHONE.trial, teacherId: abrar.id, status: 'trial' });
  await family(tx, { phone: PHONE.active, teacherId: abrar.id, status: 'active' });
  // One guardian, two of her children: one on trial, one active.
  const mixedTrial = await family(tx, { phone: PHONE.mixed, teacherId: abrar.id, status: 'trial' });
  await tx`insert into public.students (guardian_id, name, name_normalized, tz, teacher_id, status)
    select guardian_id, 'أخ مشترك', 'اخ مشترك', 'Asia/Riyadh', ${abrar.id}, 'active' from public.students where id = ${mixedTrial}`;
  for (const phone of Object.values(PHONE)) {
    await tx`insert into public.messages (direction, phone_e164, body) values ('inbound', ${phone}, 'السلام عليكم')`;
  }
  return { abrar: abrar.id, trialKid };
}

const ours = (rows: readonly { phone_e164: string }[]) =>
  [...new Set(rows.map((r) => r.phone_e164).filter((p) => p.startsWith('+966500700')))].sort();
const VISIBLE = [PHONE.mixed, PHONE.active, PHONE.own].sort();

test.describe('trial students: no direct teacher ↔ family chat (migration 20261007000001)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('the trial family is out of the scope; the mixed and active families and her own chat stay', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      expect(ours(await tx<{ phone_e164: string }[]>`select phone_e164 from public.teacher_thread_phones(${s.abrar})`)).toEqual(VISIBLE);
      const teacher = await userId(tx, USERS.teacher.email);
      const mine = await as(tx, teacher, () => tx<{ phone_e164: string }[]>`select phone_e164 from public.my_thread_phones()`);
      expect(ours(mine)).toEqual(VISIBLE);
      const messages = await as(tx, teacher, () => tx<{ phone_e164: string }[]>`select phone_e164 from public.messages`);
      expect(ours(messages)).toEqual(VISIBLE);
    });
  });

  test('she still has her trial student (lessons, schedules, reports read teacher_student_ids)', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      const ids = await tx<{ id: string }[]>`select id from public.teacher_student_ids(${s.abrar}) id where id = ${s.trialKid}`;
      expect(ids).toHaveLength(1);
      const teacher = await userId(tx, USERS.teacher.email);
      const rows = await as(tx, teacher, () => tx<{ id: string }[]>`select id from public.students where id = ${s.trialKid}`);
      expect(rows).toHaveLength(1);
    });
  });
});
