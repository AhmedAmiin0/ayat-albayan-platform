import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MEETING_ID, scheduledRow } from './internal-meetings.fakes';
import { STAFF_ID, stored } from './meeting-invites.fakes';
import { classroomApp } from './test-app';

const base = `/meetings/${MEETING_ID}`;
const INVITEE = stored({ meeting_id: MEETING_ID, kind: 'staff', profile_id: STAFF_ID, display_name: 'مريم', channel: 'in_app', status: 'sent' });
const REQ = { clientRequestId: '00000000-0000-4000-8000-0000000000cc' };

describe('scheduled meeting routes (R-MEET-01..03)', () => {
  let h: Awaited<ReturnType<typeof classroomApp>>;
  beforeAll(async () => {
    h = await classroomApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    h.reset();
    h.meetings.byId.mockResolvedValue(scheduledRow({ starts_at: '2099-01-01T10:00:00Z', planned_end_at: '2099-01-01T11:00:00Z' }));
    h.invites.invitees.byId.mockResolvedValue(INVITEE);
  });

  it('a salesperson schedules with a staff invitee: 201, the bell row, the result', async () => {
    h.invites.picks.staff.mockResolvedValue([{ id: STAFF_ID, full_name: 'مريم', role: 'teacher', tz: 'UTC' }]);
    const startsAt = new Date(Date.now() + 86_400_000).toISOString();
    const res = await h.call({ method: 'POST', url: '/meetings', token: 'sales', body: { startsAt, invitees: [{ kind: 'staff', profileId: STAFF_ID }] } });
    expect(res.statusCode).toBe(201);
    expect(res.json().invitees).toMatchObject([{ kind: 'staff', status: 'sent', channel: 'in_app' }]);
    expect(h.invites.push.notifyProfiles).toHaveBeenCalledWith(expect.objectContaining({ kind: 'meeting_invite', profileIds: [STAFF_ID] }));
  });

  it('GET /meetings/invitee-options: every staff role, 403 a guardian, 401 without login', async () => {
    for (const token of ['admin', 'teacher', 'assistant', 'sales'] as const) {
      expect((await h.call({ method: 'GET', url: '/meetings/invitee-options?q=م', token })).statusCode).toBe(200);
    }
    expect((await h.call({ method: 'GET', url: '/meetings/invitee-options', token: 'guardian' })).statusCode).toBe(403);
    expect((await h.call({ method: 'GET', url: '/meetings/invitee-options', token: null })).statusCode).toBe(401);
  });

  it('PATCH and cancel: 204 the creator, 403 another teacher, 400 a bad body', async () => {
    expect((await h.call({ method: 'PATCH', url: base, token: 'teacher', body: { title: 'جديد' } })).statusCode).toBe(204);
    expect((await h.call({ method: 'PATCH', url: base, token: 'other', body: { title: 'جديد' } })).statusCode).toBe(403);
    expect((await h.call({ method: 'PATCH', url: base, token: 'teacher', body: {} })).statusCode).toBe(400);
    expect((await h.call({ method: 'POST', url: `${base}/cancel`, token: 'teacher' })).statusCode).toBe(204);
    expect(h.invites.invitees.clearTokens).toHaveBeenCalledWith(MEETING_ID);
    expect((await h.call({ method: 'POST', url: `${base}/cancel`, token: 'other' })).statusCode).toBe(403);
  });

  it('invitees: list, add, resend for the creator or an admin; 400 bad ids', async () => {
    expect((await h.call({ method: 'GET', url: `${base}/invitees`, token: 'admin' })).statusCode).toBe(200);
    expect((await h.call({ method: 'GET', url: `${base}/invitees`, token: 'other' })).statusCode).toBe(403);
    const add = await h.call({ method: 'POST', url: `${base}/invitees`, token: 'teacher', body: { invitees: [{ kind: 'phone', phone: '+201000000105' }] } });
    expect([add.statusCode, add.json()[0].status]).toEqual([200, 'window_closed']);
    const resend = await h.call({ method: 'POST', url: `${base}/invitees/${INVITEE.id}/resend`, token: 'teacher', body: REQ });
    expect(resend.statusCode).toBe(200);
    expect((await h.call({ method: 'POST', url: `${base}/invitees/nope/resend`, token: 'teacher', body: REQ })).statusCode).toBe(400);
  });
});
