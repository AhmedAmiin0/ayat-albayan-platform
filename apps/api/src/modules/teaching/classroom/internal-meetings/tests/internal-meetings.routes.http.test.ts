import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MEETING_ID, MEETING_TOKEN } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.fakes';
import { classroomApp } from '@/modules/teaching/classroom/test-app';

const BAD = '/meetings/nope';

describe('internal meeting route objects', () => {
  let h: Awaited<ReturnType<typeof classroomApp>>;
  beforeAll(async () => {
    h = await classroomApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  it.each(['end', 'link', 'join'])('POST %s with a bad meeting id answers 400 validation_failed', async (action) => {
    const res = await h.call({ method: 'POST', url: `${BAD}/${action}`, token: 'admin' });
    expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
  });

  it('POST remove with a bad meeting id answers 400 before the identity check', async () => {
    const res = await h.call({ method: 'POST', url: `${BAD}/participants/x/remove`, token: 'admin' });
    expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
  });

  it('POST /meetings refuses a bad title or duration with 400 and writes nothing', async () => {
    const long = await h.call({ method: 'POST', url: '/meetings', body: { title: 'x'.repeat(61) } });
    const short = await h.call({ method: 'POST', url: '/meetings', body: { startsAt: '2030-01-01T09:00:00Z', durationMin: 300 } });
    expect([long.statusCode, short.statusCode]).toEqual([400, 400]);
    expect(short.json().message).toBe('validation_failed');
    expect(h.meetings.insert).not.toHaveBeenCalled();
  });

  it('POST /meetings with no body creates an instant meeting', async () => {
    const res = await h.call({ method: 'POST', url: '/meetings', token: 'teacher' });
    expect([res.statusCode, res.json().replayed, res.json().invitees]).toEqual([201, false, []]);
  });

  it('GET by-link answers the meeting id only', async () => {
    const res = await h.call({ method: 'GET', url: `/meetings/by-link/${MEETING_TOKEN}`, token: 'teacher' });
    expect([res.statusCode, res.json()]).toEqual([200, { id: MEETING_ID }]);
  });

  it('POST link answers the fresh link and the meeting id', async () => {
    const res = await h.call({ method: 'POST', url: `/meetings/${MEETING_ID}/link`, token: 'admin' });
    expect(Object.keys(res.json()).sort()).toEqual(['id', 'url']);
  });
});
