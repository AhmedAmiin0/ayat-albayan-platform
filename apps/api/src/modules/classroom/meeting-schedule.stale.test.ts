import { beforeEach, describe, expect, it } from 'vitest';
import { TEACHER } from './classroom.fakes';
import { MEETING_ID, NOW, scheduledRow } from './internal-meetings.fakes';
import { CLOSED_PHONE, OPEN_PHONE, STAFF_ID, stored } from './meeting-invites.fakes';
import { meetingServices, type MeetingServices } from './meeting-services.fakes';

// A reschedule drops the queued invitation texts: a family whose text never went out must not read «sent».
let s: MeetingServices;
const staff = stored({ meeting_id: MEETING_ID, kind: 'staff', profile_id: STAFF_ID, display_name: 'مريم', channel: 'in_app', status: 'sent' });
const family = (phone: string) => stored({ meeting_id: MEETING_ID, kind: 'student', phone_e164: phone, display_name: 'سهيلة', channel: 'whatsapp', status: 'sent' });
const fam1 = family(OPEN_PHONE);
const fam2 = family(CLOSED_PHONE);
const move = () => s.schedule.update({ user: TEACHER, id: MEETING_ID, body: { startsAt: '2026-10-06T08:00:00Z' } }, NOW);

beforeEach(() => {
  s = meetingServices();
  s.mq.byId.mockResolvedValue(scheduledRow());
  s.m.invitees.forMeeting.mockResolvedValue([staff, fam1, fam2]);
});

describe('MeetingScheduleService.update: dropped invitations (R-MEET-01/02)', () => {
  it('a dropped, never-delivered text marks its invitee failed / stale (resend stays available)', async () => {
    s.m.invitees.dropQueuedInvites.mockResolvedValue([OPEN_PHONE]);
    await move();
    expect(s.m.invitees.update).toHaveBeenCalledTimes(1);
    expect(s.m.invitees.update).toHaveBeenCalledWith(fam1.id, { status: 'failed', error_code: 'stale', sent_at: null });
  });

  it('a phone an earlier text already reached keeps «sent»', async () => {
    s.m.invitees.dropQueuedInvites.mockResolvedValue([OPEN_PHONE, CLOSED_PHONE]);
    s.m.invitees.deliveredPhones.mockResolvedValue(new Set([CLOSED_PHONE]));
    await move();
    expect(s.m.invitees.update.mock.calls.map(([id]) => id)).toEqual([fam1.id]);
  });

  it('nothing dropped: no lookup, no row touched', async () => {
    await move();
    expect(s.m.invitees.deliveredPhones).not.toHaveBeenCalled();
    expect(s.m.invitees.update).not.toHaveBeenCalled();
  });
});
