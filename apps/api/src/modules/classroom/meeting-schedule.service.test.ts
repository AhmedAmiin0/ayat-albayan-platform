import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { ADMIN, OTHER_TEACHER, TEACHER } from './classroom.fakes';
import { MEETING_ID, meetingRow, NOW, scheduledRow } from './internal-meetings.fakes';
import { CLOSED_PHONE, OPEN_PHONE, openThread, STAFF_ID, stored } from './meeting-invites.fakes';
import { sameInstant } from './meeting-schedule.service';
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
      kind: 'meeting_invite', subject: `${MEETING_ID}:2026-10-06T08:00:00.000Z:moved:${NOW.toISOString()}`, profileIds: [STAFF_ID], title: 'تغيّر موعد اجتماع',
    }));
    expect(s.m.invitees.dropQueuedInvites).toHaveBeenCalledWith(MEETING_ID);
    expect(s.m.threads.enqueue).not.toHaveBeenCalled();
  });

  it('the same instant ("+00:00" from PostgREST) or a duration alone: no bell, nothing dropped', async () => {
    s.mq.byId.mockResolvedValue(scheduledRow({ starts_at: '2026-10-05T12:00:00+00:00', planned_end_at: '2026-10-05T13:00:00+00:00' }));
    await s.schedule.update({ user: TEACHER, id: MEETING_ID, body: { startsAt: '2026-10-05T12:00:00Z' } }, NOW);
    await s.schedule.update({ user: TEACHER, id: MEETING_ID, body: { durationMin: 30 } }, NOW);
    expect(s.mq.update).toHaveBeenLastCalledWith(MEETING_ID, expect.objectContaining({ planned_end_at: '2026-10-05T12:30:00.000Z' }));
    expect(s.m.push.notifyProfiles).not.toHaveBeenCalled();
    expect(s.m.invitees.dropQueuedInvites).not.toHaveBeenCalled();
  });

  it('A→B→A rings every move (each move has its own subject)', async () => {
    const at = (iso: string) => new Date(iso);
    await s.schedule.update({ user: TEACHER, id: MEETING_ID, body: { startsAt: '2026-10-06T08:00:00Z' } }, at('2026-10-05T10:00:00Z'));
    s.mq.byId.mockResolvedValue(scheduledRow({ starts_at: '2026-10-06T08:00:00+00:00', planned_end_at: '2026-10-06T09:00:00+00:00' }));
    await s.schedule.update({ user: TEACHER, id: MEETING_ID, body: { startsAt: '2026-10-05T12:00:00Z' } }, at('2026-10-05T10:01:00Z'));
    s.mq.byId.mockResolvedValue(scheduledRow({ starts_at: '2026-10-05T12:00:00+00:00', planned_end_at: '2026-10-05T13:00:00+00:00' }));
    await s.schedule.update({ user: TEACHER, id: MEETING_ID, body: { startsAt: '2026-10-06T08:00:00Z' } }, at('2026-10-05T10:02:00Z'));
    const subjects = s.m.push.notifyProfiles.mock.calls.map(([n]) => (n as { subject: string }).subject);
    expect(new Set(subjects).size).toBe(3);
  });

  it('sameInstant compares instants, not strings', () => {
    expect(sameInstant('2026-10-05T12:00:00+00:00', '2026-10-05T12:00:00.000Z')).toBe(true);
    expect(sameInstant('2026-10-05T12:00:00Z', '2026-10-05T12:01:00Z')).toBe(false);
    expect(sameInstant(null, '2026-10-05T12:00:00Z')).toBe(false);
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
