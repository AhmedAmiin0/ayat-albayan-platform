import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { MeetingInviteeRepo } from './meeting-invitee.repo';

describe('MeetingInviteeQueries.teacherStudentIds (owner 2026-10-15)', () => {
  it('the teacher’s own students, never the not-subscribed ones (new, trial, pending_subscription)', async () => {
    const f = fakeDb({ teachers: [{ data: { id: 't1' } }], students: [{ data: [{ id: 's1' }] }] });
    expect(await new MeetingInviteeRepo(f.db).teacherStudentIds('p1')).toEqual(['s1']);
    expect(f.argsOf('students', 'eq')).toEqual(['teacher_id', 't1']);
    expect(f.argsOf('students', 'not')).toEqual(['status', 'in', '(new,trial,pending_subscription)']);
  });

  it('no teacher row → no students read', async () => {
    const f = fakeDb({ teachers: [{ data: null }] });
    expect(await new MeetingInviteeRepo(f.db).teacherStudentIds('p1')).toEqual([]);
    expect(f.calls.some((c) => c.table === 'students')).toBe(false);
  });
});

describe('MeetingInviteeQueries.guardianByPhone (a typed number)', () => {
  it('a family’s second number is that family (name and tz); unknown → null', async () => {
    const family = { id: 'g1', name: 'أم سهيلة', tz: 'Asia/Riyadh', phone_e164: '+966551110000' };
    const f = fakeDb({ guardian_phones: [{ data: { guardian: family } }, { data: null }] });
    const q = new MeetingInviteeRepo(f.db);
    expect(await q.guardianByPhone('+966552220000')).toEqual({ id: 'g1', name: 'أم سهيلة', tz: 'Asia/Riyadh' });
    expect(await q.guardianByPhone('+966559990000')).toBeNull();
  });
});
