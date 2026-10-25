import { beforeEach, describe, expect, it } from 'vitest';
import { ADMIN, TEACHER } from '../../classroom.fakes';
import { MEETING_ID, NOW, scheduledRow } from '../../internal-meetings/internal-meetings.fakes';
import { CLOSED_PHONE, OPEN_PHONE, openThread, STUDENT_A, STUDENT_B, stored } from './meeting-invites.fakes';
import { meetingServices, type MeetingServices } from '../schedule/meeting-services.fakes';

// Migration 414's race-safe daily cap fails only the recipient it hits (the 'never throws' contract).
let s: MeetingServices;
const LIMIT = new Error('message enqueue failed: invite_limit');
const pick = (id: string, phone: string) => ({ id, name: 'سهيلة', code: 'AB-0001', guardian: { id: `g-${id}`, name: 'أم سهيلة', phone_e164: phone, tz: 'Asia/Riyadh' } });
const REQ = '00000000-0000-4000-8000-0000000000cc';

beforeEach(() => {
  s = meetingServices();
  s.mq.byId.mockResolvedValue(scheduledRow());
  s.m.picks.teacherStudentIds.mockResolvedValue([STUDENT_A, STUDENT_B]);
  s.m.picks.students.mockResolvedValue([pick(STUDENT_A, OPEN_PHONE), pick(STUDENT_B, CLOSED_PHONE)]);
  s.m.threads.thread.mockImplementation(async (phone: string) => openThread(phone, NOW));
});

describe('invite_limit from the trigger (R-MEET-02)', () => {
  it('two invitees, the second hits the cap: both answered, the second failed with its link, none left pending', async () => {
    s.m.threads.enqueue.mockResolvedValueOnce({ id: 'm1' }).mockRejectedValueOnce(LIMIT);
    const body = { invitees: [{ kind: 'student', studentId: STUDENT_A }, { kind: 'student', studentId: STUDENT_B }] };
    const [a, b] = await s.invites.add({ user: TEACHER, id: MEETING_ID, body }, NOW);
    expect(a).toMatchObject({ status: 'sent', channel: 'whatsapp' });
    expect(a?.link).toMatch(/\/m\//);
    expect(b).toMatchObject({ status: 'failed', channel: 'link', error_code: 'invite_limit' });
    expect(b?.link).toMatch(/\/m\//);
    expect(b?.invitation_text).toContain(b?.link ?? 'x');
    const statuses = s.m.invitees.update.mock.calls.flatMap(([, patch]) => ('status' in patch ? [patch.status] : []));
    expect(statuses).toEqual(['sent', 'failed']);
    expect(s.m.sender.kick).toHaveBeenCalledTimes(1);
  });

  it('a resend that hits the cap returns the fresh link with the failed result (never a dead link and nothing)', async () => {
    const fam = stored({ meeting_id: MEETING_ID, kind: 'phone', phone_e164: OPEN_PHONE, display_name: OPEN_PHONE, channel: 'whatsapp', status: 'sent' });
    s.m.invitees.byId.mockResolvedValue(fam);
    s.m.threads.enqueue.mockRejectedValue(LIMIT);
    const r = await s.invites.resend({ user: ADMIN, id: MEETING_ID, inviteeId: fam.id, body: { clientRequestId: REQ } }, NOW);
    expect(r).toMatchObject({ status: 'failed', error_code: 'invite_limit' });
    expect(r.link).toMatch(/\/m\//);
    expect(s.m.invitees.update).toHaveBeenCalledWith(fam.id, expect.objectContaining({ token_hash: expect.any(String) }));
    expect(s.m.sender.kick).not.toHaveBeenCalled();
  });
});
