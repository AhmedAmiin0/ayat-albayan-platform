import { describe, expect, it } from 'vitest';
import { families, isUpcoming, noticeDedupKey, planNotice } from './notice.plan';
import { AT, FROM, guardian, notice, NOW, student, teacher } from './schedule-notices.fakes';

const phones = (n = notice()) => planNotice(n, NOW).messages.map((m) => m.phone_e164);
const pushedTo = (n = notice()) => planNotice(n, NOW).pushes.flatMap((p) => p.profileIds);

describe('planNotice: both the teacher and the family (owner 2026-10-30)', () => {
  it('one WhatsApp each: the teacher’s and the guardian’s, keyed per change and recipient', () => {
    const { messages } = planNotice(notice(), NOW);
    const parts = messages.map((m) => [m.phone_e164, m.template_key, m.dedup_key, m.guardian_id]);
    expect(parts).toEqual([
      ['+966500000001', 'lesson_cancelled', 'lesson_cancelled:L1:t:T1', null],
      ['+447700900001', 'lesson_cancelled', 'lesson_cancelled:L1:g:G1', 'G1'],
    ]);
    expect(messages.every((m) => m.lesson_id === 'L1' && m.expires_at === AT.toISOString())).toBe(true);
  });

  it('familyWhatsApp false (the booking confirmation went): the teacher’s row only, bells kept', () => {
    const plan = planNotice(notice({ familyWhatsApp: false }), NOW);
    expect(plan.messages.map((m) => m.dedup_key)).toEqual(['lesson_cancelled:L1:t:T1']);
    expect(plan.pushes.map((p) => p.profileIds[0])).toEqual(['pT1', 'pG1']);
  });

  it('each one in their own zone: the teacher in Riyadh, the guardian in London', () => {
    const [toTeacher, toGuardian] = planNotice(notice(), NOW).messages;
    expect(toTeacher?.template_params['3']).toBe('الاثنين 2 نوفمبر، 11:00 ص');
    expect(toGuardian?.template_params).toMatchObject({ '1': 'أم سهيلة', '3': 'الاثنين 2 نوفمبر، 8:00 ص' });
  });

  it('the bells: teacher and guardian, never the person who made the change', () => {
    expect(pushedTo()).toEqual(['pT1', 'pG1']);
    expect(pushedTo(notice({ actorId: 'pT1' }))).toEqual(['pG1']);
    // The teacher still gets the WhatsApp when they made the change (owner: «both»).
    expect(phones(notice({ actorId: 'pT1' }))).toContain('+966500000001');
  });

  it('a student app user gets their own bell, in their zone; an adult student who is the guardian once', () => {
    const own = student({ profile_id: 'pS1', tz: 'Asia/Dubai' });
    const pushes = planNotice(notice({ students: [own] }), NOW).pushes;
    expect(pushes.map((p) => p.profileIds[0])).toEqual(['pT1', 'pG1', 'pS1']);
    const self = student({ profile_id: 'pG1' });
    expect(pushedTo(notice({ students: [self] }))).toEqual(['pT1', 'pG1']);
  });

  it('a push carries the student, the time in the viewer’s zone, the old time for a move, and the ids', () => {
    const [push] = planNotice(notice({ key: 'lesson_rescheduled', from: FROM }), NOW).pushes;
    expect(push).toMatchObject({
      kind: 'lesson_rescheduled',
      subject: 'L1',
      vars: { student: 'سهيلة', when: 'الاثنين 2 نوفمبر 11:00', from: 'الأحد 1 نوفمبر 18:00' },
      data: { lessonId: 'L1', studentId: 'S1' },
    });
  });

  it('no teacher number, an inactive teacher or a disabled login: no WhatsApp to them, the bell stays', () => {
    for (const t of [teacher({ phone_e164: null }), teacher({ status: 'inactive' }), teacher({ profile: { disabled_at: 'x' } })]) {
      expect(phones(notice({ teachers: [{ teacher: t, at: AT }] }))).toEqual(['+447700900001']);
    }
  });

  it('a profile-less teacher or guardian: WhatsApp only', () => {
    const n = notice({ teachers: [{ teacher: teacher({ profile_id: null }), at: AT }] });
    expect(pushedTo(n)).toEqual(['pG1']);
    expect(pushedTo(notice({ students: [student({ guardian: guardian({ profile_id: null }) })] }))).toEqual(['pT1']);
  });
});

describe('planNotice: only upcoming lessons', () => {
  it('a lesson already started (or a move from one) notifies nobody', () => {
    expect(planNotice(notice({ at: NOW }), NOW)).toEqual({ messages: [], pushes: [] });
    const fromPast = notice({ key: 'lesson_rescheduled', from: new Date(NOW.getTime() - 1) });
    expect(planNotice(fromPast, NOW).messages).toEqual([]);
    expect(isUpcoming(notice({ key: 'lesson_rescheduled', from: FROM }), NOW)).toBe(true);
  });
});

describe('families and dedup keys', () => {
  it('siblings of one guardian: one message naming both', () => {
    const two = [student(), student({ id: 'S2', name: 'مريم' })];
    const { messages } = planNotice(notice({ students: two }), NOW);
    expect(messages.map((m) => m.template_params['2'])).toEqual(['سهيلة ومريم', 'سهيلة ومريم']);
    expect(families(two)).toHaveLength(1);
  });

  it('two families on a group lesson: one each; a student without a guardian is skipped', () => {
    const other = student({ id: 'S3', guardian: guardian({ id: 'G2', phone_e164: '+201000000002' }) });
    expect(phones(notice({ students: [student(), other, student({ id: 'S4', guardian: null })] }))).toEqual([
      '+966500000001', '+447700900001', '+201000000002',
    ]);
  });

  it('the same change twice gives the same keys (a retry is a no-op); a new subject a new key', () => {
    expect(noticeDedupKey(notice(), 't:T1')).toBe(noticeDedupKey(notice(), 't:T1'));
    const keys = (subject: string) =>
      planNotice(notice({ subject }), NOW).messages.map((m) => m.dedup_key);
    expect(keys('L1@1')).not.toEqual(keys('L1@2'));
  });
});
