import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LESSON, LESSON_ID, LINK_TOKEN, OPEN } from '@/modules/teaching/classroom/classroom.fakes';
import { classroomApp } from '@/modules/teaching/classroom/test-app';

describe('lesson join route objects', () => {
  let h: Awaited<ReturnType<typeof classroomApp>>;
  beforeAll(async () => {
    h = await classroomApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(OPEN);
    h.reset();
  });
  afterEach(() => vi.useRealTimers());

  it.each(['/lessons/nope/room/join', '/lessons/nope/join-link/url'])(
    'POST %s with a bad id answers 400 validation_failed',
    async (url) => {
      const res = await h.call({ method: 'POST', url, token: 'admin' });
      expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
    },
  );

  it('refuses a send whose student id is not a uuid, and sends nothing', async () => {
    const url = `/lessons/${LESSON_ID}/join-link`;
    const res = await h.call({ method: 'POST', url, token: 'admin', body: { studentId: 'x' } });
    expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
    expect(h.outbox.send).not.toHaveBeenCalled();
  });

  it('answers the copied link with its url and expiry', async () => {
    const url = `/lessons/${LESSON_ID}/join-link/url`;
    const res = await h.call({ method: 'POST', url, token: 'teacher' });
    expect(res.statusCode).toBe(200);
    expect(Object.keys(res.json()).sort()).toEqual(['expires_at', 'url']);
  });

  it('answers 500 response_invalid when the link would point at a lesson id that is not a uuid', async () => {
    h.queries.lesson.mockResolvedValue({ ...LESSON, id: 'x' });
    const res = await h.call({ method: 'GET', url: `/join-links/${LINK_TOKEN}/lesson` });
    expect([res.statusCode, res.json().message]).toEqual([500, 'response_invalid']);
  });
});
