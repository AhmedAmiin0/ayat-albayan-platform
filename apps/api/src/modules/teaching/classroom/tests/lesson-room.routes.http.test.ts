import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { EARLY } from '@/modules/teaching/classroom/classroom.fakes';
import {
  STUDENT_LESSON,
  STUDENT_TOKEN,
} from '@/modules/teaching/classroom/student-link/student-link.fakes';
import { classroomApp } from '@/modules/teaching/classroom/test-app';

const page = `/public/student/${STUDENT_TOKEN}`;

describe('lesson room route objects', () => {
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

  it.each(['/lessons/nope/room/open', '/students/nope/join-link'])(
    'POST %s with a bad id answers 400 validation_failed',
    async (url) => {
      const res = await h.call({ method: 'POST', url, token: 'admin' });
      expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
    },
  );

  it('answers an unknown student link 404 link_invalid, not a validation error', async () => {
    const res = await h.call({ method: 'GET', url: '/public/student/nope', token: null });
    expect(res.statusCode).toBe(404);
  });

  it('answers 500 response_invalid when the page would carry a lesson id that is not a uuid', async () => {
    h.studentLinks.lessonsAhead.mockResolvedValue([{ ...STUDENT_LESSON, id: 'x' }]);
    const res = await h.call({ method: 'GET', url: page, token: null });
    expect([res.statusCode, res.json().message]).toEqual([500, 'response_invalid']);
  });
});
