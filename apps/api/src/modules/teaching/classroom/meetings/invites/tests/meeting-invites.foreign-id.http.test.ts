import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MEETING_ID, scheduledRow } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.fakes';
import { classroomApp } from '@/modules/teaching/classroom/test-app';
import { STAFF_ID, stored } from '@/modules/teaching/classroom/meetings/invites/meeting-invites.fakes';

const base = `/meetings/${MEETING_ID}`;
const INVITEE = stored({
  meeting_id: MEETING_ID, kind: 'staff', profile_id: STAFF_ID, display_name: 'مريم', channel: 'in_app', status: 'sent',
});
const REQ = { clientRequestId: '00000000-0000-4000-8000-0000000000cc' };
const ADD = { invitees: [{ kind: 'staff', profileId: STAFF_ID }] };
const SCOPED = ['other', 'sales'] as const;

describe('meeting invitations with another login’s meeting', () => {
  let h: Awaited<ReturnType<typeof classroomApp>>;
  beforeAll(async () => {
    h = await classroomApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    h.reset();
    h.meetings.byId.mockResolvedValue(scheduledRow({ starts_at: '2099-01-01T10:00:00Z', planned_end_at: '2099-01-01T11:00:00Z' }));
    h.invites.invitees.byId.mockResolvedValue(INVITEE);
    h.invites.picks.staff.mockResolvedValue([{ id: STAFF_ID, full_name: 'مريم', role: 'teacher', tz: 'UTC' }]);
  });

  const expectNothingSent = () => {
    expect(h.invites.invitees.insert).not.toHaveBeenCalled();
    expect(h.invites.invitees.update).not.toHaveBeenCalled();
    expect(h.invites.push.notifyProfiles).not.toHaveBeenCalled();
    expect(h.invites.threads.enqueue).not.toHaveBeenCalled();
  };

  it.each(SCOPED)('another login’s meeting is 403 on adding invitees for %s; nobody invited', async (token) => {
    const res = await h.call({ method: 'POST', url: `${base}/invitees`, token, body: ADD });
    expect(res.statusCode).toBe(403);
    expect(h.invites.picks.staff).not.toHaveBeenCalled();
    expectNothingSent();
  });

  it.each(SCOPED)('another login’s meeting is 403 on a resend for %s; no invitee read', async (token) => {
    const res = await h.call({ method: 'POST', url: `${base}/invitees/${INVITEE.id}/resend`, token, body: REQ });
    expect(res.statusCode).toBe(403);
    expect(h.invites.invitees.byId).not.toHaveBeenCalled();
    expectNothingSent();
  });

  it('the creator still adds a staff invitee', async () => {
    const res = await h.call({ method: 'POST', url: `${base}/invitees`, token: 'teacher', body: ADD });
    expect(res.statusCode).toBe(200);
    expect(h.invites.invitees.insert).toHaveBeenCalledTimes(1);
  });
});
