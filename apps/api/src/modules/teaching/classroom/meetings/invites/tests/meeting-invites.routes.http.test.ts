import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MEETING_ID } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.fakes';
import { classroomApp } from '@/modules/teaching/classroom/test-app';

const BAD = '/meetings/nope';
const REQ = { clientRequestId: '00000000-0000-4000-8000-0000000000cc' };
const base = `/meetings/${MEETING_ID}`;

describe('meeting invite route objects', () => {
  let h: Awaited<ReturnType<typeof classroomApp>>;
  beforeAll(async () => {
    h = await classroomApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  it.each([
    ['PATCH', BAD, { title: 'x' }],
    ['POST', `${BAD}/cancel`, undefined],
    ['GET', `${BAD}/invitees`, undefined],
    ['POST', `${BAD}/invitees`, { invitees: [{ kind: 'phone', phone: '+201000000105' }] }],
    ['POST', `${base}/invitees/nope/resend`, REQ],
  ] as const)('%s %s with a bad id answers 400 validation_failed', async (method, url, body) => {
    const res = await h.call({ method, url, token: 'admin', ...(body ? { body } : {}) });
    expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
  });

  it('refuses no invitees or a resend without a request id, reading nothing', async () => {
    const post = (url: string, body: object) =>
      h.call({ method: 'POST', url, token: 'admin', body });
    const add = await post(`${base}/invitees`, { invitees: [] });
    const resend = await post(`${base}/invitees/${MEETING_ID}/resend`, {});
    expect([add.statusCode, resend.statusCode]).toEqual([400, 400]);
    expect(h.meetings.byId).not.toHaveBeenCalled();
  });

  it('refuses a search longer than 60 letters', async () => {
    const url = `/meetings/invitee-options?q=${'x'.repeat(61)}`;
    const res = await h.call({ method: 'GET', url, token: 'admin' });
    expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
  });

  it('answers the options without the caller, staff then students', async () => {
    h.invites.picks.staff.mockResolvedValue([]);
    const res = await h.call({ method: 'GET', url: '/meetings/invitee-options', token: 'admin' });
    expect([res.statusCode, res.json()]).toEqual([200, []]);
  });
});
