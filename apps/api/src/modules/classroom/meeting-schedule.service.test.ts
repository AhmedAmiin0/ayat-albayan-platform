import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { ADMIN, OTHER_TEACHER, TEACHER } from './classroom.fakes';
import { MEETING_ID, meetingRow, NOW, scheduledRow } from './internal-meetings.fakes';
import { CLOSED_PHONE, OPEN_PHONE, openThread, STAFF_ID, stored } from './meeting-invites.fakes';
import { meetingServices, type MeetingServices } from './meeting-services.fakes';

let s: MeetingServices;
const fail = async (p: Promise<unknown>) => (await p.catch((e: HttpException) => e)) as HttpException;
const staff = stored({ meeting_id: MEETING_ID, kind: 'staff', profile_id: STAFF_ID, display_name: 'مريم', channel: 'in_app', status: 'sent', tz: 'Asia/Riyadh' });
const family = (phone: string) => stored({ meeting_id: MEETING_ID, kind: 'phone', phone_e164: phone, display_name: phone, channel: 'whatsapp', status: 'sent' });

beforeEach(() => {
  s = meetingServices();
  s.mq.byId.mockResolvedValue(scheduledRow());
  s.m.invitees.forMeeting.mockResolvedValue([staff, family(OPEN_PHONE), family(CLOSED_PHONE)]);
  s.m.threads.thread.mockImplementation(async (phone: string) => (phone === OPEN_PHONE ? openThread(phone, NOW) : null));
});

describe('MeetingScheduleService.update (R-MEET-01)', () => {
  it('a new time keeps the length and re-notifies staff with a new dedup subject', async () => {
    await s.schedule.update({ user: TEACHER, id: MEETING_ID, body: { startsAt: '2026-10-06T08:00:00Z' } }, NOW);
    expect(s.mq.update).toHaveBeenCalledWith(MEETING_ID, {
      title: 'اجتماع الإدارة', starts_at: '2026-10-06T08:00:00.000Z', planned_end_at: '2026-10-06T09:00:00.000Z',
    });
    expect(s.m.push.notifyProfiles).toHaveBeenCalledTimes(1);
    expect(s.m.push.notifyProfiles).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'meeting_invite', subject: `${MEETING_ID}:2026-10-06T08:00:00.000Z`, profileIds: [STAFF_ID], title: 'تغيّر موعد اجتماع',
    }));
    expect(s.m.threads.enqueue).not.toHaveBeenCalled();
  });

  it('a title alone notifies nobody; a duration alone needs a schedule', async () => {
    await s.schedule.update({ user: ADMIN, id: MEETING_ID, body: { title: 'جديد' } }, NOW);
    expect(s.mq.update).toHaveBeenCalledWith(MEETING_ID, { title: 'جديد' });
    expect(s.m.push.notifyProfiles).not.toHaveBeenCalled();
    s.mq.byId.mockResolvedValue(meetingRow());
    const e = await fail(s.schedule.update({ user: ADMIN, id: MEETING_ID, body: { durationMin: 30 } }, NOW));
    expect(e.getResponse()).toMatchObject({ code: 'not_scheduled' });
  });

  it('403 for another staff login, 410 once cancelled, 400 for a past time', async () => {
    expect((await fail(s.schedule.update({ user: OTHER_TEACHER, id: MEETING_ID, body: { title: 'x' } }, NOW))).getStatus()).toBe(403);
    const past = await fail(s.schedule.update({ user: TEACHER, id: MEETING_ID, body: { startsAt: '2026-10-01T08:00:00Z' } }, NOW));
    expect(past.getResponse()).toMatchObject({ code: 'starts_in_past' });
    s.mq.byId.mockResolvedValue(scheduledRow({ cancelled_at: '2026-10-05T09:00:00Z' }));
    expect((await fail(s.schedule.update({ user: TEACHER, id: MEETING_ID, body: { title: 'x' } }, NOW))).getStatus()).toBe(410);
  });
});

describe('MeetingScheduleService.cancel (R-MEET-01)', () => {
  it('stamps cancelled_at, revokes every personal link, tells staff, chats only open-window families', async () => {
    await s.schedule.cancel({ user: TEACHER, id: MEETING_ID }, NOW);
    expect(s.mq.cancel).toHaveBeenCalledWith(MEETING_ID, NOW.toISOString());
    expect(s.m.invitees.clearTokens).toHaveBeenCalledWith(MEETING_ID);
    expect(s.m.push.notifyProfiles).toHaveBeenCalledWith(expect.objectContaining({ subject: `cancel:${MEETING_ID}`, title: 'أُلغي اجتماع' }));
    expect(s.m.threads.enqueue).toHaveBeenCalledTimes(1);
    expect(s.m.threads.enqueue.mock.calls[0]?.[0]).toMatchObject({ phone_e164: OPEN_PHONE, dedup_key: `meeting_cancel:${MEETING_ID}:${OPEN_PHONE}` });
    expect(s.m.sender.kick).toHaveBeenCalledTimes(1);
  });

  it('twice is a no-op; 403 for another staff login', async () => {
    s.mq.cancel.mockResolvedValue(false);
    await s.schedule.cancel({ user: ADMIN, id: MEETING_ID }, NOW);
    expect(s.m.invitees.clearTokens).not.toHaveBeenCalled();
    expect((await fail(s.schedule.cancel({ user: OTHER_TEACHER, id: MEETING_ID }, NOW))).getStatus()).toBe(403);
  });
});
