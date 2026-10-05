import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { EARLY, LESSON_ID, OPEN, STUDENT_ID } from './classroom.fakes';
import { STUDENT_TOKEN } from './student-link.fakes';
import { classroomApp } from './test-app';

const open = `/lessons/${LESSON_ID}/room/open`;
const page = `/public/student/${STUDENT_TOKEN}`;

describe('meeting routes: open the room, the student link', () => {
  let h: Awaited<ReturnType<typeof classroomApp>>;
  beforeAll(async () => {
    h = await classroomApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(EARLY);
    h.reset();
  });
  afterEach(() => vi.useRealTimers());

  it('POST room/open: 200 for the admin and the teacher, with the open window', async () => {
    for (const token of ['admin', 'teacher'] as const) {
      const res = await h.call({ method: 'POST', url: open, token });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ state: 'open', room_opened_at: EARLY.toISOString() });
    }
  });

  it('POST room/open: 401 without login, 403 for another teacher, an assistant or a guardian', async () => {
    expect((await h.call({ method: 'POST', url: open, token: null })).statusCode).toBe(401);
    for (const token of ['other', 'assistant', 'guardian'] as const) {
      expect((await h.call({ method: 'POST', url: open, token })).statusCode).toBe(403);
    }
  });

  it('GET /public/student/:token needs no login and answers the next lesson', async () => {
    const res = await h.call({ method: 'GET', url: page, token: null });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ first_name: 'سهيلة', lesson: { id: LESSON_ID, window: { state: 'early' } } });
  });

  it('POST /public/student/:token/join: 403 before the window, 200 a guest token once open', async () => {
    const early = await h.call({ method: 'POST', url: `${page}/join`, token: null, body: {}, ip: '2.2.2.2' });
    expect(early.statusCode).toBe(403);
    expect(early.json()).toMatchObject({ code: 'join_not_open_yet' });
    vi.setSystemTime(OPEN);
    const res = await h.call({ method: 'POST', url: `${page}/join`, token: null, body: {}, ip: '2.2.2.3' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ role: 'guest', room: `lesson-${LESSON_ID}` });
  });

  it('POST /students/:id/join-link: the admin gets a /s/ URL, a teacher is refused', async () => {
    const res = await h.call({ method: 'POST', url: `/students/${STUDENT_ID}/join-link` });
    expect(res.statusCode).toBe(200);
    expect(res.json().url).toMatch(/^https:\/\/app\.example\.test\/s\/[A-Za-z0-9_-]{32}$/);
    expect((await h.call({ method: 'POST', url: `/students/${STUDENT_ID}/join-link`, token: 'teacher' })).statusCode).toBe(403);
  });
});
