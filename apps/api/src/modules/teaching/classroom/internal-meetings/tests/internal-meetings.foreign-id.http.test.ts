import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { classroomApp } from '@/modules/teaching/classroom/test-app';
import { MEETING_ID, MEETING_TOKEN } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.fakes';

const base = `/meetings/${MEETING_ID}`;
const SCOPED = ['other', 'sales'] as const;

describe('internal meeting routes with someone else’s meeting', () => {
  let h: Awaited<ReturnType<typeof classroomApp>>;
  beforeAll(async () => {
    h = await classroomApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  it.each(SCOPED)('a meeting created by another login is 403 on a new link for %s; nothing rotated', async (token) => {
    const res = await h.call({ method: 'POST', url: `${base}/link`, token });
    expect(res.statusCode).toBe(403);
    expect(res.body).not.toContain('/m/');
    expect(h.meetings.rotate).not.toHaveBeenCalled();
  });

  it('the creator still issues a new link', async () => {
    const res = await h.call({ method: 'POST', url: `${base}/link`, token: 'teacher' });
    expect(res.statusCode).toBe(200);
    expect(h.meetings.rotate).toHaveBeenCalledTimes(1);
  });

  it.each(SCOPED)('a replaced or unknown link is 404 link_invalid for %s; no meeting id', async (token) => {
    h.meetings.byHash.mockResolvedValue(null);
    const res = await h.call({ method: 'GET', url: `/meetings/by-link/${MEETING_TOKEN}`, token });
    expect([res.statusCode, res.json().code]).toEqual([404, 'link_invalid']);
    expect(res.body).not.toContain(MEETING_ID);
  });

  it('a salesperson cannot remove anyone from another login’s meeting; nothing sent', async () => {
    const res = await h.call({ method: 'POST', url: `${base}/participants/guest-0123456789ab/remove`, token: 'sales' });
    expect([res.statusCode, res.json().code]).toEqual([403, 'cannot_remove']);
    expect(h.http).not.toHaveBeenCalled();
  });

  it('a guardian joining a staff meeting by id is 403; the meeting is not read', async () => {
    const res = await h.call({ method: 'POST', url: `${base}/join`, token: 'guardian' });
    expect(res.statusCode).toBe(403);
    expect(res.body).not.toContain('token');
    expect(h.meetings.byId).not.toHaveBeenCalled();
  });

  it.each(SCOPED)('an unknown meeting id is 404 meeting_not_found for %s', async (token) => {
    h.meetings.byId.mockResolvedValue(null);
    const res = await h.call({ method: 'POST', url: `${base}/join`, token });
    expect([res.statusCode, res.json().code]).toEqual([404, 'meeting_not_found']);
    expect(h.meetings.profileName).not.toHaveBeenCalled();
  });
});
