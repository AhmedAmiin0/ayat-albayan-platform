import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { ADMIN, ASSISTANT, OTHER_TEACHER, SALES, TEACHER } from '../../classroom.fakes';
import { MEETING_ID, NOW, scheduledRow } from '../../internal-meetings/internal-meetings.fakes';
import { hashMeetingToken } from '../../internal-meetings/internal-meetings.token';
import { CLOSED_PHONE, OPEN_PHONE, openThread, STAFF_ID, STUDENT_A, stored } from './meeting-invites.fakes';
import { meetingServices, ORIGIN, type MeetingServices } from '../schedule/meeting-services.fakes';

let s: MeetingServices;
const fail = async (p: Promise<unknown>) => (await p.catch((e: HttpException) => e)) as HttpException;
const REQ = '00000000-0000-4000-8000-0000000000bb';
const family = stored({ meeting_id: MEETING_ID, kind: 'student', student_id: STUDENT_A, phone_e164: OPEN_PHONE, display_name: 'أم سهيلة', channel: 'link', status: 'window_closed' });
const staff = stored({ meeting_id: MEETING_ID, kind: 'staff', profile_id: STAFF_ID, display_name: 'مريم', channel: 'in_app', status: 'sent' });
const resend = (inviteeId: string, user = TEACHER) => s.invites.resend({ user, id: MEETING_ID, inviteeId, body: { clientRequestId: REQ } }, NOW);

beforeEach(() => {
  s = meetingServices();
  s.mq.byId.mockResolvedValue(scheduledRow());
  s.m.picks.teacherStudentIds.mockResolvedValue([STUDENT_A]);
  s.m.invitees.byId.mockImplementation(async (_m: string, id: string) => [family, staff].find((i) => i.id === id) ?? null);
  s.m.threads.thread.mockImplementation(async (phone: string) => openThread(phone, NOW));
});

describe('MeetingInvitesService.resend (R-MEET-02)', () => {
  it('a new personal link for that invitee only, sent with a resend dedup key', async () => {
    const r = await resend(family.id);
    const token = (r.link ?? '').slice(`${ORIGIN}/m/`.length);
    expect(s.m.invitees.update).toHaveBeenCalledWith(family.id, { token_hash: hashMeetingToken(token) });
    expect(s.m.invitees.update.mock.calls.every(([id]) => id === family.id)).toBe(true);
    expect(s.m.threads.enqueue.mock.calls[0]?.[0].dedup_key).toBe(`meeting_invite:${MEETING_ID}:${OPEN_PHONE}:2026-10-05T12:00:00.000Z:resend:${REQ}`);
    expect(r).toMatchObject({ status: 'sent', channel: 'whatsapp' });
  });

  it('a retried request id sends nothing and rotates nothing', async () => {
    s.m.invitees.queued.mockResolvedValue(true);
    const r = await resend(family.id);
    expect([r.link, r.invitation_text]).toEqual([null, null]);
    expect(s.m.invitees.update).not.toHaveBeenCalled();
    expect(s.m.threads.enqueue).not.toHaveBeenCalled();
  });

  it('staff get the bell row again (own subject); 404 an unknown invitee; 403 others; 409 the limit', async () => {
    await resend(staff.id);
    expect(s.m.push.notifyProfiles).toHaveBeenCalledWith(expect.objectContaining({ subject: `${MEETING_ID}:2026-10-05T12:00:00.000Z:resend:${REQ}` }));
    expect((await fail(resend('00000000-0000-4000-8000-0000000000ff'))).getResponse()).toMatchObject({ code: 'invitee_not_found' });
    expect((await fail(resend(family.id, OTHER_TEACHER))).getStatus()).toBe(403);
    s.m.invitees.whatsappSince.mockResolvedValue(100);
    expect((await fail(resend(family.id))).getResponse()).toMatchObject({ code: 'invite_limit' });
  });
});

describe('MeetingInvitesService.add (R-MEET-02)', () => {
  it('skips who is already invited; 400 past 30 invitees', async () => {
    s.m.invitees.forMeeting.mockResolvedValue([family]);
    const body = { invitees: [{ kind: 'phone', phone: OPEN_PHONE }, { kind: 'phone', phone: CLOSED_PHONE }] };
    const r = await s.invites.add({ user: ADMIN, id: MEETING_ID, body }, NOW);
    expect(r).toHaveLength(1);
    s.m.invitees.forMeeting.mockResolvedValue(Array.from({ length: 30 }, () => family));
    const e = await fail(s.invites.add({ user: ADMIN, id: MEETING_ID, body: { invitees: [{ kind: 'phone', phone: '+201000000104' }] } }, NOW));
    expect(e.getResponse()).toMatchObject({ code: 'too_many_invitees' });
  });

  it('list: no phone in any row', async () => {
    s.m.invitees.forMeeting.mockResolvedValue([family, staff]);
    const rows = await s.invites.list({ user: TEACHER, id: MEETING_ID });
    for (const r of rows) expect(Object.keys(r).sort()).toEqual(['channel', 'display_name', 'error_code', 'id', 'kind', 'sent_at', 'status']);
  });
});

describe('MeetingInvitesService.options (R-MEET-02)', () => {
  it('staff {id,name,role} and students {id,name,code}; never a phone; not the caller', async () => {
    s.m.picks.staff.mockResolvedValue([
      { id: STAFF_ID, full_name: 'مريم', role: 'teacher', tz: 'UTC' },
      { id: SALES.id, full_name: 'أنا', role: 'sales', tz: 'UTC' },
    ]);
    s.m.picks.students.mockResolvedValue([{ id: 's1', name: 'سهيلة', code: 'AB-0001', guardian: { id: 'g', name: 'x', phone_e164: OPEN_PHONE, tz: 'UTC' } }]);
    const out = await s.invites.options(SALES, { q: 'م' });
    expect(out).toEqual([
      { kind: 'staff', id: STAFF_ID, name: 'مريم', role: 'teacher' },
      { kind: 'student', id: 's1', name: 'سهيلة', code: 'AB-0001' },
    ]);
    expect(s.m.picks.students).toHaveBeenCalledWith({ scope: { kind: 'all' }, q: 'م' });
  });

  it('a teacher sees only their students; an assistant the assigned ones', async () => {
    s.m.picks.teacherStudentIds.mockResolvedValue(['s1']);
    await s.invites.options(TEACHER, {});
    expect(s.m.picks.students).toHaveBeenLastCalledWith({ scope: { kind: 'ids', ids: ['s1'] } });
    s.m.picks.assistantStudentIds.mockResolvedValue(['s2']);
    await s.invites.options(ASSISTANT, {});
    expect(s.m.picks.students).toHaveBeenLastCalledWith({ scope: { kind: 'ids', ids: ['s2'] } });
  });
});
