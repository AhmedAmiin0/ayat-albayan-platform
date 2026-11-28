import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LINK_TOKEN } from '@/modules/teaching/classroom/classroom.fakes';
import { MEETING_TOKEN } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.fakes';
import { STUDENT_TOKEN } from '@/modules/teaching/classroom/student-link/student-link.fakes';
import { classroomApp } from '@/modules/teaching/classroom/test-app';

const BAD_NAME = { name: 'x'.repeat(31) };
const JOINS = [
  `/public/join/${LINK_TOKEN}`,
  `/public/student/${STUDENT_TOKEN}/join`,
  `/public/meetings/${MEETING_TOKEN}/join`,
];

/** docs/62 part 1: a public token route keeps its order, the rate limit before the body. */
describe('guest joins on their route objects', () => {
  let h: Awaited<ReturnType<typeof classroomApp>>;
  beforeAll(async () => {
    h = await classroomApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  it.each(JOINS.map((url, i) => [url, `10.0.9.${i}`]))(
    'POST %s answers 429 before a bad name is ever read',
    async (url, ip) => {
      const codes: number[] = [];
      const send = () => h.call({ method: 'POST', url, token: null, body: BAD_NAME, ip });
      for (let i = 0; i < 11; i += 1) codes.push((await send()).statusCode);
      expect(codes[0]).not.toBe(429);
      expect(codes[10]).toBe(429);
    },
  );
});
