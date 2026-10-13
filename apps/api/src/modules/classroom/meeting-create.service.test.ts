import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { SALES, TEACHER } from './classroom.fakes';
import { MEETING_ID, meetingRow, NOW } from './internal-meetings.fakes';
import { hashMeetingToken } from './internal-meetings.token';
import { CLOSED_PHONE, OPEN_PHONE, openThread, STAFF_ID, STUDENT_A, STUDENT_B } from './meeting-invites.fakes';
import { meetingServices, ORIGIN, type MeetingServices } from './meeting-services.fakes';

let s: MeetingServices;
const fail = async (p: Promise<unknown>) => (await p.catch((e: HttpException) => e)) as HttpException;
const tokenOf = (url: string) => url.slice(`${ORIGIN}/m/`.length);
const SCHEDULED = { startsAt: '2026-10-06T12:00:00Z', durationMin: 45 };
const STUDENTS = [
  { id: STUDENT_A, name: 'سهيلة', code: 'AB-0001', guardian: { id: 'g1', name: 'أم سهيلة', phone_e164: OPEN_PHONE, tz: 'Africa/Cairo' } },
  { id: STUDENT_B, name: 'مريم', code: 'AB-0002', guardian: { id: 'g2', name: 'أم مريم', phone_e164: CLOSED_PHONE, tz: 'Africa/Cairo' } },
];
const RESULT_KEYS = ['channel', 'display_name', 'error_code', 'id', 'invitation_text', 'kind', 'link', 'sent_at', 'status'];

beforeEach(() => {
  s = meetingServices();
  s.m.picks.staff.mockResolvedValue([{ id: STAFF_ID, full_name: 'أ. مريم', role: 'teacher', tz: 'Asia/Riyadh' }]);
  s.m.picks.students.mockImplementation(async (q: { ids?: string[] }) => STUDENTS.filter((x) => !q.ids || q.ids.includes(x.id)));
  s.m.threads.thread.mockImplementation(async (phone: string) => (phone === OPEN_PHONE ? openThread(phone, NOW) : null));
});

describe('MeetingCreateService: instant (as before)', () => {
  it('a /m/<token> link, only its hash stored, the default title, no LiveKit call, no invitees', async () => {
    const r = await s.create.create({ user: TEACHER, body: {} }, NOW);
    expect([r.id, r.replayed, r.invitees]).toEqual([MEETING_ID, false, []]);
    expect(r.url).toMatch(/^https:\/\/app\.example\.test\/m\/[A-Za-z0-9_-]{43}$/);
    expect(s.mq.insert).toHaveBeenCalledWith({
      title: 'اجتماع', createdBy: TEACHER.id, hash: hashMeetingToken(tokenOf(r.url)), startsAt: null, plannedEndAt: null, clientRequestId: null,
    });
    expect(s.post).not.toHaveBeenCalled();
  });

  it('400 for a bad title or duration', async () => {
    expect((await fail(s.create.create({ user: TEACHER, body: { title: 'x'.repeat(61) } }, NOW))).getStatus()).toBe(400);
    expect((await fail(s.create.create({ user: TEACHER, body: { ...SCHEDULED, durationMin: 300 } }, NOW))).getStatus()).toBe(400);
  });
});

describe('MeetingCreateService: scheduled with invitees (R-MEET-01/02)', () => {
  it('stores starts_at and planned_end_at; 400 starts_in_past / too_far_ahead before any row', async () => {
    await s.create.create({ user: SALES, body: SCHEDULED }, NOW);
    expect(s.mq.insert).toHaveBeenCalledWith(expect.objectContaining({ startsAt: '2026-10-06T12:00:00.000Z', plannedEndAt: '2026-10-06T12:45:00.000Z' }));
    const past = await fail(s.create.create({ user: SALES, body: { startsAt: '2026-10-05T09:00:00Z' } }, NOW));
    expect(past.getResponse()).toMatchObject({ code: 'starts_in_past' });
    const far = await fail(s.create.create({ user: SALES, body: { startsAt: '2027-02-01T09:00:00Z' } }, NOW));
    expect(far.getResponse()).toMatchObject({ code: 'too_far_ahead' });
    expect(s.mq.insert).toHaveBeenCalledTimes(1);
  });

  it('staff in-app, families by chat inside the window, window_closed with link + text otherwise', async () => {
    const invitees = [{ kind: 'staff', profileId: STAFF_ID }, { kind: 'student', studentId: STUDENT_A }, { kind: 'student', studentId: STUDENT_B }];
    const r = await s.create.create({ user: SALES, body: { ...SCHEDULED, invitees } }, NOW);
    expect(r.invitees.map((i) => [i.kind, i.status, i.channel, i.error_code])).toEqual([
      ['staff', 'sent', 'in_app', null],
      ['student', 'sent', 'whatsapp', null],
      ['student', 'window_closed', 'link', 'no_thread'],
    ]);
    expect(s.m.push.notifyProfiles).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'meeting_invite', subject: `${MEETING_ID}:2026-10-06T12:00:00.000Z`, profileIds: [STAFF_ID], data: { meetingId: MEETING_ID },
    }));
    expect(s.m.threads.enqueue).toHaveBeenCalledTimes(1);
    const row = s.m.threads.enqueue.mock.calls[0]?.[0];
    expect(row).toMatchObject({ phone_e164: OPEN_PHONE, guardian_id: 'g1', status: 'queued', created_by: SALES.id });
    expect(row.dedup_key).toBe(`meeting_invite:${MEETING_ID}:${OPEN_PHONE}:2026-10-06T12:00:00.000Z`);
    expect(row.template_key).toBeUndefined();
    const [, family, closed] = r.invitees;
    expect(row.body).toContain(family?.link);
    expect(closed?.link).toMatch(/\/m\/[A-Za-z0-9_-]{43}$/);
    expect(closed?.invitation_text).toContain(closed?.link);
    expect(s.m.sender.kick).toHaveBeenCalledTimes(1);
  });

  it('never returns the guardian phone: every result has exactly the public keys', async () => {
    const invitees = [{ kind: 'student', studentId: STUDENT_A }, { kind: 'phone', phone: '+20 100 000 0103' }];
    const r = await s.create.create({ user: SALES, body: { invitees } }, NOW);
    for (const i of r.invitees) expect(Object.keys(i).sort()).toEqual(RESULT_KEYS);
    expect(JSON.stringify(r)).not.toContain(OPEN_PHONE);
    expect(r.invitees.map((i) => i.display_name)).toEqual(['سهيلة', '+201000000103']);
    expect(s.m.invitees.insert.mock.calls[0]?.[0].map((x) => x.phone_e164 ?? null)).toEqual([OPEN_PHONE, '+201000000103']);
  });

  it('only hashes are stored: each personal link hashes to its row', async () => {
    const r = await s.create.create({ user: SALES, body: { invitees: [{ kind: 'student', studentId: STUDENT_B }] } }, NOW);
    const link = r.invitees[0]?.link ?? '';
    expect(s.m.invitees.update).toHaveBeenCalledWith(r.invitees[0]?.id, { token_hash: hashMeetingToken(tokenOf(link)) });
  });

  it('409 invite_limit past 100 WhatsApp invitations a day, before the meeting exists', async () => {
    s.m.invitees.whatsappSince.mockResolvedValue(100);
    const e = await fail(s.create.create({ user: SALES, body: { invitees: [{ kind: 'student', studentId: STUDENT_A }] } }, NOW));
    expect([e.getStatus(), e.getResponse()]).toEqual([409, expect.objectContaining({ code: 'invite_limit' })]);
    expect(s.mq.insert).not.toHaveBeenCalled();
  });

  it('a retried clientRequestId sends nothing again and shows no personal link', async () => {
    const clientRequestId = '00000000-0000-4000-8000-0000000000aa';
    s.mq.byRequest.mockResolvedValue(meetingRow());
    s.m.invitees.forMeeting.mockResolvedValue([{ ...(await s.m.invitees.insert([{ meeting_id: MEETING_ID, kind: 'phone', phone_e164: OPEN_PHONE, display_name: 'x', channel: 'whatsapp', status: 'sent' }]))[0] }]);
    const r = await s.create.create({ user: SALES, body: { clientRequestId, invitees: [{ kind: 'phone', phone: OPEN_PHONE }] } }, NOW);
    expect(r.replayed).toBe(true);
    expect(r.invitees).toMatchObject([{ status: 'sent', link: null, invitation_text: null }]);
    expect(s.mq.insert).not.toHaveBeenCalled();
    expect(s.m.threads.enqueue).not.toHaveBeenCalled();
    expect(s.mq.rotate).toHaveBeenCalledWith(MEETING_ID, hashMeetingToken(tokenOf(r.url)));
  });
});
