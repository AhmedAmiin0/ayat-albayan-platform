import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { SALES, TEACHER } from './classroom.fakes';
import type { MeetingInviteeQueries } from './meeting-invitee.queries';
import { dedupeInvitees, MeetingInviteeResolver } from './meeting-invitee.resolver';
import { OPEN_PHONE, pickQueries, STAFF_ID, STUDENT_A } from './meeting-invites.fakes';

let picks: ReturnType<typeof pickQueries>;
const resolver = () => new MeetingInviteeResolver(picks as unknown as MeetingInviteeQueries);
const fail = async (p: Promise<unknown>) => (await p.catch((e: HttpException) => e)) as HttpException;
const student = { id: STUDENT_A, name: 'سهيلة', code: 'AB-0001', guardian: { id: 'g1', name: 'أم سهيلة', phone_e164: OPEN_PHONE, tz: 'Asia/Riyadh' } };

beforeEach(() => {
  picks = pickQueries();
});

describe('MeetingInviteeResolver (R-MEET-02)', () => {
  it('staff by profile, a student through the guardian phone and tz, a typed phone in E.164', async () => {
    picks.staff.mockResolvedValue([{ id: STAFF_ID, full_name: 'مريم', role: 'teacher', tz: 'Africa/Cairo' }]);
    picks.students.mockResolvedValue([student]);
    const out = await resolver().resolve({
      user: SALES,
      invitees: [{ kind: 'staff', profileId: STAFF_ID }, { kind: 'student', studentId: STUDENT_A }, { kind: 'phone', phone: '٠١٠٠٠٠٠٠١٠٢' }],
    });
    expect(out).toEqual([
      { kind: 'staff', profileId: STAFF_ID, studentId: null, phone: null, displayName: 'مريم', tz: 'Africa/Cairo' },
      { kind: 'student', profileId: null, studentId: STUDENT_A, phone: OPEN_PHONE, displayName: 'سهيلة', tz: 'Asia/Riyadh' },
      { kind: 'phone', profileId: null, studentId: null, phone: '+201000000102', displayName: '+201000000102', tz: 'Africa/Cairo' },
    ]);
    expect(picks.students).toHaveBeenCalledWith({ scope: { kind: 'all' }, ids: [STUDENT_A] });
  });

  it('400 invalid_phone; 404 staff_not_found; 404 a student outside the teacher scope', async () => {
    expect((await fail(resolver().resolve({ user: SALES, invitees: [{ kind: 'phone', phone: '12345' }] }))).getResponse()).toMatchObject({ code: 'invalid_phone' });
    expect((await fail(resolver().resolve({ user: SALES, invitees: [{ kind: 'staff', profileId: STAFF_ID }] }))).getStatus()).toBe(404);
    picks.teacherStudentIds.mockResolvedValue([]);
    const e = await fail(resolver().resolve({ user: TEACHER, invitees: [{ kind: 'student', studentId: STUDENT_A }] }));
    expect(e.getResponse()).toMatchObject({ code: 'student_not_found' });
    expect(picks.students).toHaveBeenCalledWith({ scope: { kind: 'ids', ids: [] }, ids: [STUDENT_A] });
  });

  it('a known guardian lends a typed number their name; the creator never invites themselves', async () => {
    picks.guardianByPhone.mockResolvedValue({ id: 'g1', name: 'أم سهيلة', tz: 'Asia/Riyadh' });
    picks.staff.mockResolvedValue([{ id: SALES.id, full_name: 'أنا', role: 'sales', tz: 'UTC' }]);
    const out = await resolver().resolve({ user: SALES, invitees: [{ kind: 'staff', profileId: SALES.id }, { kind: 'phone', phone: OPEN_PHONE }] });
    expect(out.map((i) => [i.kind, i.displayName, i.tz])).toEqual([['phone', 'أم سهيلة', 'Asia/Riyadh']]);
  });

  it('dedupeInvitees keeps the first of one phone or profile', () => {
    const a = { kind: 'student' as const, profileId: null, studentId: 'a', phone: OPEN_PHONE, displayName: 'a', tz: 'UTC' };
    expect(dedupeInvitees([a, { ...a, studentId: 'b' }, { ...a, kind: 'phone', studentId: null }])).toEqual([a]);
  });
});
