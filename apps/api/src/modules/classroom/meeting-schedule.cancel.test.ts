import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { ADMIN, ASSISTANT, OTHER_TEACHER, TEACHER } from './classroom.fakes';
import { MEETING_ID, NOW, scheduledRow } from './internal-meetings.fakes';
import { CLOSED_PHONE, OPEN_PHONE, openThread, STAFF_ID, stored } from './meeting-invites.fakes';
import { meetingServices, type MeetingServices } from './meeting-services.fakes';

let s: MeetingServices;
const fail = async (p: Promise<unknown>) => (await p.catch((e: HttpException) => e)) as HttpException;
const staff = stored({ meeting_id: MEETING_ID, kind: 'staff', profile_id: STAFF_ID, display_name: 'مريم', channel: 'in_app', status: 'sent' });
const family = (phone: string, status = 'sent') =>
  stored({ meeting_id: MEETING_ID, kind: 'phone', phone_e164: phone, display_name: phone, channel: 'whatsapp', status });
const OTHER = '+201000000109';

beforeEach(() => {
  s = meetingServices();
  s.mq.byId.mockResolvedValue(scheduledRow());
  s.m.invitees.forMeeting.mockResolvedValue([staff, family(OPEN_PHONE), family(CLOSED_PHONE)]);
  s.m.threads.thread.mockImplementation(async (phone: string) => (phone === CLOSED_PHONE ? null : openThread(phone, NOW)));
  s.m.invitees.deliveredPhones.mockResolvedValue(new Set([OPEN_PHONE, CLOSED_PHONE, OTHER]));
});

describe('MeetingScheduleService.cancel (R-MEET-01)', () => {
  it('stamps cancelled_at, closes the room, revokes links, drops queued texts, tells staff, chats open-window families', async () => {
    await s.schedule.cancel({ user: TEACHER, id: MEETING_ID }, NOW);
    expect(s.mq.cancel).toHaveBeenCalledWith(MEETING_ID, NOW.toISOString());
    expect(s.post.mock.calls[0]?.[0]).toContain('livekit.RoomService/DeleteRoom');
    expect(s.m.invitees.clearTokens).toHaveBeenCalledWith(MEETING_ID);
    expect(s.m.invitees.dropQueuedInvites).toHaveBeenCalledWith(MEETING_ID);
    expect(s.m.push.notifyProfiles).toHaveBeenCalledWith(expect.objectContaining({ subject: `cancel:${MEETING_ID}`, title: 'أُلغي اجتماع' }));
    expect(s.m.threads.enqueue).toHaveBeenCalledTimes(1);
    expect(s.m.threads.enqueue.mock.calls[0]?.[0]).toMatchObject({ phone_e164: OPEN_PHONE, dedup_key: `meeting_cancel:${MEETING_ID}:${OPEN_PHONE}` });
    expect(s.m.threads.enqueue.mock.calls[0]?.[0]).toMatchObject({ sent_by_teacher_id: 't1' });
    expect(s.m.sender.kick).toHaveBeenCalledTimes(1);
  });

  it("an admin's cancellation names no teacher", async () => {
    await s.schedule.cancel({ user: ADMIN, id: MEETING_ID }, NOW);
    expect(s.m.threads.enqueue.mock.calls[0]?.[0]).toMatchObject({ sent_by_teacher_id: null });
  });

  it('a «sent» family whose invitation was dropped before going out is never texted', async () => {
    s.m.invitees.deliveredPhones.mockResolvedValue(new Set());
    await s.schedule.cancel({ user: ADMIN, id: MEETING_ID }, NOW);
    expect(s.m.threads.enqueue).not.toHaveBeenCalled();
  });

  it('a family that got the invitation but whose later resend failed still gets the cancellation', async () => {
    s.m.invitees.forMeeting.mockResolvedValue([family(OPEN_PHONE, 'failed')]);
    await s.schedule.cancel({ user: ADMIN, id: MEETING_ID }, NOW);
    expect(s.m.threads.enqueue).toHaveBeenCalledTimes(1);
    expect(s.m.threads.enqueue.mock.calls[0]?.[0]).toMatchObject({ phone_e164: OPEN_PHONE, body: expect.stringContaining('أُلغي') });
  });

  it('a family whose invitation found the window closed is tried too (its window may be open now)', async () => {
    s.m.invitees.forMeeting.mockResolvedValue([family(OPEN_PHONE, 'window_closed')]);
    await s.schedule.cancel({ user: ADMIN, id: MEETING_ID }, NOW);
    expect(s.m.threads.enqueue.mock.calls[0]?.[0]).toMatchObject({ dedup_key: `meeting_cancel:${MEETING_ID}:${OPEN_PHONE}` });
  });

  it('a teacher never messages a phone outside their inbox scope; a caller without inbox.send never chats', async () => {
    s.m.invitees.forMeeting.mockResolvedValue([family(OTHER)]);
    await s.schedule.cancel({ user: TEACHER, id: MEETING_ID }, NOW);
    expect(s.m.threads.enqueue).not.toHaveBeenCalled();
    s.mq.byId.mockResolvedValue(scheduledRow({ created_by: ASSISTANT.id }));
    s.m.invitees.forMeeting.mockResolvedValue([family(OPEN_PHONE)]);
    await s.schedule.cancel({ user: ASSISTANT, id: MEETING_ID }, NOW);
    expect(s.m.threads.enqueue).not.toHaveBeenCalled();
  });

  it('twice is a no-op; 403 for another staff login', async () => {
    s.mq.cancel.mockResolvedValue(false);
    await s.schedule.cancel({ user: ADMIN, id: MEETING_ID }, NOW);
    expect(s.m.invitees.clearTokens).not.toHaveBeenCalled();
    expect((await fail(s.schedule.cancel({ user: OTHER_TEACHER, id: MEETING_ID }, NOW))).getStatus()).toBe(403);
  });

  it('410 meeting_ended on an ended meeting (ends_at, or past its window) before any side effect', async () => {
    for (const row of [scheduledRow({ ends_at: '2026-10-05T09:30:00Z' }), scheduledRow({ starts_at: '2026-10-03T08:00:00Z', planned_end_at: '2026-10-03T09:00:00Z' })]) {
      s.mq.byId.mockResolvedValue(row);
      const e = await fail(s.schedule.cancel({ user: ADMIN, id: MEETING_ID }, NOW));
      expect([e.getStatus(), e.getResponse()]).toEqual([410, expect.objectContaining({ code: 'meeting_ended' })]);
    }
    expect(s.mq.cancel).not.toHaveBeenCalled();
    expect(s.m.invitees.clearTokens).not.toHaveBeenCalled();
    expect(s.m.push.notifyProfiles).not.toHaveBeenCalled();
    expect(s.m.threads.enqueue).not.toHaveBeenCalled();
  });

  it('an already cancelled meeting is a silent no-op', async () => {
    s.mq.byId.mockResolvedValue(scheduledRow({ cancelled_at: '2026-10-05T09:00:00Z' }));
    await s.schedule.cancel({ user: ADMIN, id: MEETING_ID }, NOW);
    expect(s.mq.cancel).not.toHaveBeenCalled();
  });
});
