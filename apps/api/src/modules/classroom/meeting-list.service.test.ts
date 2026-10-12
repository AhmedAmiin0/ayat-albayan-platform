import { beforeEach, describe, expect, it } from 'vitest';
import { ADMIN, OTHER_TEACHER, SALES, TEACHER } from './classroom.fakes';
import { meetingRow, NOW, scheduledRow } from './internal-meetings.fakes';
import { meetingServices, type MeetingServices } from './meeting-services.fakes';

let s: MeetingServices;
beforeEach(() => {
  s = meetingServices();
});

describe('MeetingListService (R-MEET-01)', () => {
  it('an admin lists everyone’s, anyone else their own (created_by) and upcoming', async () => {
    await s.list.list(ADMIN, NOW);
    expect(s.m.lists.latest).toHaveBeenCalledWith(null);
    expect(s.m.lists.upcoming).toHaveBeenCalledWith({ createdBy: null, since: '2026-10-04T10:00:00.000Z' });
    await s.list.list(SALES, NOW);
    expect(s.m.lists.latest).toHaveBeenLastCalledWith(SALES.id);
    expect(s.m.lists.myInvites).toHaveBeenLastCalledWith(SALES.id);
  });

  it('created OR invited: an invited meeting shows with my_invite, not manageable', async () => {
    const theirs = scheduledRow({ id: 'm-inv', created_by: OTHER_TEACHER.id });
    s.m.lists.latest.mockResolvedValue([]);
    s.m.lists.myInvites.mockResolvedValue([{ meeting_id: 'm-inv', status: 'sent', channel: 'in_app' }]);
    s.m.lists.byIds.mockResolvedValue([theirs]);
    s.m.lists.counts.mockResolvedValue(new Map([['m-inv', 3]]));
    const [view] = await s.list.list(TEACHER, NOW);
    expect(s.m.lists.byIds).toHaveBeenCalledWith(['m-inv']);
    expect(view).toMatchObject({ id: 'm-inv', my_invite: { status: 'sent', channel: 'in_app' }, invitees_count: 3, can_manage: false });
    expect(view?.window).toMatchObject({ state: 'early', opens_at: '2026-10-05T11:45:00.000Z' });
    expect(view?.can_join).toBe(false);
  });

  it('coming scheduled first (soonest first), then the rest newest first, one row per meeting', async () => {
    const later = scheduledRow({ id: 'later', starts_at: '2026-10-07T12:00:00Z', planned_end_at: '2026-10-07T13:00:00Z' });
    const soon = scheduledRow({ id: 'soon' });
    const old = meetingRow({ id: 'old', created_at: '2026-10-01T09:00:00Z' });
    const fresh = meetingRow({ id: 'fresh', created_at: '2026-10-05T09:30:00Z' });
    s.m.lists.latest.mockResolvedValue([old, fresh, later]);
    s.m.lists.upcoming.mockResolvedValue([soon, later]);
    const ids = (await s.list.list(TEACHER, NOW)).map((v) => v.id);
    expect(ids).toEqual(['soon', 'later', 'fresh', 'old']);
  });

  it('a cancelled meeting is listed as ended, never joinable', async () => {
    s.m.lists.latest.mockResolvedValue([scheduledRow({ cancelled_at: '2026-10-05T09:00:00Z' })]);
    const [view] = await s.list.list(TEACHER, new Date('2026-10-05T12:10:00Z'));
    expect(view).toMatchObject({ state: 'ended', can_join: false, cancelled_at: '2026-10-05T09:00:00Z' });
  });
});
