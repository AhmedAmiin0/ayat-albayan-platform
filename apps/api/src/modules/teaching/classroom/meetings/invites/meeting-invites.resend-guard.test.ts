import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { ADMIN, ASSISTANT, TEACHER } from '../../classroom.fakes';
import { MEETING_ID, meetingRow, NOW, scheduledRow } from '../../internal-meetings/internal-meetings.fakes';
import { OPEN_PHONE, openThread, STUDENT_A, STUDENT_B, stored } from './meeting-invites.fakes';
import { meetingServices, type MeetingServices } from '../schedule/meeting-services.fakes';

// «أعد الإرسال» reaches only whom add() would let the caller invite (R-MEET-02).
let s: MeetingServices;
const fail = async (p: Promise<unknown>) => (await p.catch((e: HttpException) => e)) as HttpException;
const REQ = '00000000-0000-4000-8000-0000000000dd';
const phoneRow = stored({ meeting_id: MEETING_ID, kind: 'phone', phone_e164: OPEN_PHONE, display_name: 'أم سهيلة', channel: 'whatsapp', status: 'sent', created_by: ADMIN.id });
const studentRow = (id: string) => stored({ meeting_id: MEETING_ID, kind: 'student', student_id: id, phone_e164: OPEN_PHONE, display_name: 'سهيلة', channel: 'link', status: 'window_closed' });
const resend = (user = TEACHER, inviteeId = phoneRow.id) => s.invites.resend({ user, id: MEETING_ID, inviteeId, body: { clientRequestId: REQ } }, NOW);

beforeEach(() => {
  s = meetingServices();
  s.mq.byId.mockResolvedValue(scheduledRow());
  s.m.picks.teacherStudentIds.mockResolvedValue([STUDENT_A]);
  s.m.picks.assistantStudentIds.mockResolvedValue([STUDENT_A]);
  s.m.threads.thread.mockImplementation(async (phone: string) => openThread(phone, NOW));
});

describe('MeetingInvitesService.resend guards', () => {
  it('a teacher resending an admin-added phone row: 403, token and status unchanged', async () => {
    s.m.invitees.byId.mockResolvedValue(phoneRow);
    const e = await fail(resend());
    expect([e.getStatus(), e.getResponse()]).toEqual([403, expect.objectContaining({ code: 'phone_invite_not_allowed' })]);
    expect(s.m.invitees.update).not.toHaveBeenCalled();
    expect(s.m.threads.enqueue).not.toHaveBeenCalled();
  });

  it('a teacher resending a student outside their scope (a trial, another teacher): 404', async () => {
    s.m.invitees.byId.mockResolvedValue(studentRow(STUDENT_B));
    const e = await fail(resend(TEACHER, studentRow(STUDENT_B).id));
    expect([e.getStatus(), e.getResponse()]).toEqual([404, expect.objectContaining({ code: 'student_not_found' })]);
    expect(s.m.invitees.update).not.toHaveBeenCalled();
  });

  it('an assistant resending their own in-scope student still gets a fresh link', async () => {
    s.mq.byId.mockResolvedValue(scheduledRow({ created_by: ASSISTANT.id }));
    const row = studentRow(STUDENT_A);
    s.m.invitees.byId.mockResolvedValue(row);
    const r = await resend(ASSISTANT, row.id);
    expect(r.link).toMatch(/\/m\//);
  });

  it('an admin may resend a phone row', async () => {
    s.m.invitees.byId.mockResolvedValue(phoneRow);
    expect((await resend(ADMIN)).status).toBe('sent');
  });
});

describe('MeetingInvitesService.list: a typed phone has no name for a non-all caller', () => {
  it('teacher: empty name on phone rows; admin: the stored name', async () => {
    s.m.invitees.forMeeting.mockResolvedValue([phoneRow, studentRow(STUDENT_A)]);
    const t = await s.invites.list({ user: TEACHER, id: MEETING_ID });
    expect(t.map((v) => v.display_name)).toEqual(['', 'سهيلة']);
    const a = await s.invites.list({ user: ADMIN, id: MEETING_ID });
    expect(a[0]?.display_name).toBe('أم سهيلة');
  });

  it('the create replay masks it the same way', async () => {
    s.mq.byRequest.mockResolvedValue(meetingRow());
    s.m.invitees.forMeeting.mockResolvedValue([phoneRow]);
    const r = await s.create.create({ user: TEACHER, body: { clientRequestId: REQ } }, NOW);
    expect(r.invitees[0]?.display_name).toBe('');
  });
});
