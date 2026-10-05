import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LESSON_ID, LINK_TOKEN } from './classroom.fakes';
import { MEETING_ID, MEETING_TOKEN } from './internal-meetings.fakes';
import { classroomApp } from './test-app';

// Root cause of «السبورة للعرض فقط» (owner, 2026-10-05): staff who opened a shared link entered as
// guests. These routes let a signed-in staff member find their own staff room behind the link.

describe('staff behind a shared link', () => {
  let h: Awaited<ReturnType<typeof classroomApp>>;
  beforeAll(async () => {
    h = await classroomApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  it('GET /meetings/by-link/:token: {id} for any staff login, 404 a bad link, 403 a guardian, 401 signed out', async () => {
    for (const token of ['admin', 'teacher', 'other', 'assistant'] as const) {
      const res = await h.call({ method: 'GET', url: `/meetings/by-link/${MEETING_TOKEN}`, token });
      expect([res.statusCode, res.json()]).toEqual([200, { id: MEETING_ID }]);
    }
    const bad = await h.call({ method: 'GET', url: '/meetings/by-link/short' });
    expect([bad.statusCode, bad.json().code]).toEqual([404, 'link_invalid']);
    expect((await h.call({ method: 'GET', url: `/meetings/by-link/${MEETING_TOKEN}`, token: 'guardian' })).statusCode).toBe(403);
    expect((await h.call({ method: 'GET', url: `/meetings/by-link/${MEETING_TOKEN}`, token: null })).statusCode).toBe(401);
  });

  it('GET /join-links/:token/lesson: {lessonId} for the admin and the lesson teacher, 403 another teacher', async () => {
    for (const token of ['admin', 'teacher'] as const) {
      const res = await h.call({ method: 'GET', url: `/join-links/${LINK_TOKEN}/lesson`, token });
      expect([res.statusCode, res.json()]).toEqual([200, { lessonId: LESSON_ID }]);
    }
    expect((await h.call({ method: 'GET', url: `/join-links/${LINK_TOKEN}/lesson`, token: 'other' })).statusCode).toBe(403);
    expect((await h.call({ method: 'GET', url: `/join-links/${LINK_TOKEN}/lesson`, token: 'guardian' })).statusCode).toBe(403);
    h.queries.linkByHash.mockResolvedValueOnce(null);
    const gone = await h.call({ method: 'GET', url: `/join-links/${LINK_TOKEN}/lesson` });
    expect([gone.statusCode, gone.json().code]).toEqual([404, 'link_invalid']);
    expect((await h.call({ method: 'GET', url: '/join-links/x/lesson' })).statusCode).toBe(404);
  });
});
