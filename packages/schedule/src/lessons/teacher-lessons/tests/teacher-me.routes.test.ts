import { describe, expect, it } from 'vitest';
import { teacherMeRoutes as routes } from '..';

const TEACHER = '00000000-0000-4000-8000-0000000000a1';
const STUDENT = '00000000-0000-4000-8000-0000000000c1';
const CACHED = {
  id: TEACHER,
  display_name_ar: 'أبرار',
  gender: 'female',
  programs: ['quran'],
  tz: 'Africa/Cairo',
  meeting_link: null,
  meeting_mode: null,
  students: [{ id: STUDENT, code: 'AB-0001', name: 'سهيلة', tz: 'Africa/Cairo', status: 'active' }],
};
const ME = { ...CACHED, platform_classroom: true };

describe('teacherMeRoutes (R-TCH-03)', () => {
  it('keeps GET /teachers/me, let in by self.teacher, tagged teachers', () => {
    const route = routes.me;
    expect(`${route.method} ${route.path}`).toBe('GET /teachers/me');
    expect([route.permissions, route.tags]).toEqual([['self.teacher'], ['teachers']]);
  });

  it('takes no params, query or body', () => {
    expect(['params', 'query', 'body'].filter((k) => k in routes.me)).toEqual([]);
  });

  it('answers her row and students', () => {
    expect(routes.me.response.parse(ME)).toEqual(ME);
  });

  it('keeps an answer cached before the classroom switch, without platform_classroom', () => {
    expect(routes.me.response.parse(CACHED)).toEqual(CACHED);
  });

  it('refuses an unknown gender, program, meeting mode or student status', () => {
    const bad = [
      { ...ME, gender: 'x' },
      { ...ME, programs: ['x'] },
      { ...ME, meeting_mode: 'x' },
      { ...ME, students: [{ ...ME.students[0], status: 'x' }] },
    ];
    expect(bad.map((b) => routes.me.response.safeParse(b).success)).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });

  it('refuses a readable id where a uuid belongs, and a missing student list', () => {
    expect(routes.me.response.safeParse({ ...ME, id: 't1' }).success).toBe(false);
    expect(routes.me.response.safeParse({ ...ME, students: undefined }).success).toBe(false);
  });
});
