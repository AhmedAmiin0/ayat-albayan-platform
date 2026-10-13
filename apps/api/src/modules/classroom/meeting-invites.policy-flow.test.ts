import { beforeEach, describe, expect, it } from 'vitest';
import { ADMIN, ASSISTANT, TEACHER } from './classroom.fakes';
import { MEETING_ID, NOW, scheduledRow } from './internal-meetings.fakes';
import { CLOSED_PHONE, OPEN_PHONE, openThread, STUDENT_A, stored } from './meeting-invites.fakes';
import { meetingServices, type MeetingServices } from './meeting-services.fakes';

// The WhatsApp policy of invitations (owner 2026-10-13): who may queue a chat text, what the others get.
let s: MeetingServices;
const OTHER = '+201000000109';
const pick = (phone: string) => ({ id: STUDENT_A, name: 'سهيلة', code: 'AB-0001', guardian: { id: 'g1', name: 'أم سهيلة', phone_e164: phone, tz: 'Asia/Riyadh' } });
const addStudent = (user = TEACHER) => s.invites.add({ user, id: MEETING_ID, body: { invitees: [{ kind: 'student', studentId: STUDENT_A }] } }, NOW);
const REQ = '00000000-0000-4000-8000-0000000000bb';

beforeEach(() => {
  s = meetingServices();
  s.mq.byId.mockResolvedValue(scheduledRow());
  s.m.picks.teacherStudentIds.mockResolvedValue([STUDENT_A]);
  s.m.picks.assistantStudentIds.mockResolvedValue([STUDENT_A]);
  s.m.picks.students.mockResolvedValue([pick(OPEN_PHONE)]);
  s.m.threads.thread.mockImplementation(async (phone: string) => (phone === CLOSED_PHONE ? null : openThread(phone, NOW)));
});

describe('invitations: who may queue WhatsApp (R-MEET-02)', () => {
  it('a teacher chats their own student family (inside the inbox scope)', async () => {
    const [r] = await addStudent();
    expect(r).toMatchObject({ status: 'sent', channel: 'whatsapp' });
    expect(s.m.threads.enqueue).toHaveBeenCalledTimes(1);
  });

  it('a family outside the teacher inbox scope: link to copy, nothing queued, not counted', async () => {
    s.m.picks.students.mockResolvedValue([pick(OTHER)]);
    const [r] = await addStudent();
    expect(r).toMatchObject({ status: 'window_closed', channel: 'link', error_code: 'chat_not_allowed' });
    expect(r?.link).toMatch(/\/m\//);
    expect(s.m.threads.enqueue).not.toHaveBeenCalled();
    expect(s.m.invitees.whatsappSince).not.toHaveBeenCalled();
  });

  it('a classroom assistant never queues WhatsApp: the row is a link, the creator gets link and text', async () => {
    s.mq.byId.mockResolvedValue(scheduledRow({ created_by: ASSISTANT.id }));
    const [r] = await addStudent(ASSISTANT);
    expect(s.m.invitees.insert.mock.calls[0]?.[0]?.[0]).toMatchObject({ channel: 'link' });
    expect(r).toMatchObject({ status: 'window_closed', channel: 'link', error_code: 'chat_not_allowed' });
    expect(r?.invitation_text).toContain(r?.link ?? 'x');
    expect(s.m.threads.enqueue).not.toHaveBeenCalled();
  });

  it('resend by a caller without the chat right: a fresh link, no queue lookup, nothing queued', async () => {
    s.mq.byId.mockResolvedValue(scheduledRow({ created_by: ASSISTANT.id }));
    const fam = stored({ meeting_id: MEETING_ID, kind: 'student', student_id: STUDENT_A, phone_e164: OPEN_PHONE, display_name: 'سهيلة', channel: 'link', status: 'window_closed' });
    s.m.invitees.byId.mockResolvedValue(fam);
    const r = await s.invites.resend({ user: ASSISTANT, id: MEETING_ID, inviteeId: fam.id, body: { clientRequestId: REQ } }, NOW);
    expect(r).toMatchObject({ error_code: 'chat_not_allowed' });
    expect(r.link).not.toBeNull();
    expect(s.m.invitees.queued).not.toHaveBeenCalled();
    expect(s.m.threads.enqueue).not.toHaveBeenCalled();
  });

  it('no thread: a teacher reads session_closed (never no_thread); an admin the exact code', async () => {
    s.m.picks.students.mockResolvedValue([pick(CLOSED_PHONE)]);
    const [t] = await addStudent();
    expect(t?.error_code).toBe('session_closed');
    s.m.invitees.forMeeting.mockResolvedValue([]);
    const [a] = await s.invites.add({ user: ADMIN, id: MEETING_ID, body: { invitees: [{ kind: 'phone', phone: CLOSED_PHONE }] } }, NOW);
    expect(a?.error_code).toBe('no_thread');
  });

  it('a teacher text names the teacher (sent_by_teacher_id), an admin text nobody', async () => {
    await addStudent();
    expect(s.m.threads.enqueue.mock.calls[0]?.[0]).toMatchObject({ sent_by_teacher_id: 't1' });
    s.m.invitees.forMeeting.mockResolvedValue([]);
    await s.invites.add({ user: ADMIN, id: MEETING_ID, body: { invitees: [{ kind: 'phone', phone: OTHER }] } }, NOW);
    expect(s.m.threads.enqueue.mock.calls[1]?.[0]).toMatchObject({ sent_by_teacher_id: null });
  });
});
