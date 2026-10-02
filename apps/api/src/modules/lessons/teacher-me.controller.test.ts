import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TEACHER, TEACHER_ID } from './lessons.fakes';
import { lessonsApp } from './test-app';

type Harness = Awaited<ReturnType<typeof lessonsApp>>;
const WEEK = 'from=2026-10-04T00:00:00Z&to=2026-10-11T00:00:00Z';
const ME = {
  id: TEACHER_ID,
  display_name_ar: 'أبرار',
  gender: 'female',
  programs: ['quran'],
  tz: 'Africa/Cairo',
  meeting_link: null,
  students: [],
};

describe('GET /teachers/me, /teachers/me/lessons — teacher self-service (R-TCH-03, R-SCH-08)', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await lessonsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  it('returns my teachers row and students, looked up by my own profile', async () => {
    h.me.me.mockResolvedValue(ME);
    const res = await h.call({ method: 'GET', url: '/teachers/me', token: 'teacher' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(ME);
    expect(h.me.me).toHaveBeenCalledWith(TEACHER.id);
  });

  it('a teacher login without a teachers row → 404 teacher_not_linked', async () => {
    h.me.me.mockResolvedValue(null);
    const res = await h.call({ method: 'GET', url: '/teachers/me', token: 'unlinked' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ code: 'teacher_not_linked', message: 'teacher_not_linked' });
    const lessons = await h.call({ method: 'GET', url: `/teachers/me/lessons?${WEEK}`, token: 'unlinked' });
    expect(lessons.json()).toMatchObject({ code: 'teacher_not_linked' });
  });

  it('my week: always scoped to my own teacher id, whatever teacherId is sent', async () => {
    const res = await h.call({
      method: 'GET',
      url: `/teachers/me/lessons?${WEEK}&teacherId=00000000-0000-4000-8000-0000000000b2`,
      token: 'teacher',
    });
    expect(res.statusCode).toBe(200);
    expect(h.lessons.window).toHaveBeenCalledWith({
      from: new Date('2026-10-04T00:00:00Z'),
      to: new Date('2026-10-11T00:00:00Z'),
      teacherId: TEACHER_ID,
    });
    expect(res.json()[0].allowed_events).toEqual(['confirm', 'complete', 'mark_late', 'excuse', 'mark_no_show']);
  });

  it('admins and guardians get 403 on the teacher routes; 400 range_too_large still applies', async () => {
    expect((await h.call({ method: 'GET', url: '/teachers/me' })).statusCode).toBe(403);
    expect((await h.call({ method: 'GET', url: '/teachers/me', token: 'guardian' })).statusCode).toBe(403);
    const wide = await h.call({ method: 'GET', url: '/teachers/me/lessons?from=2026-10-01T00:00:00Z&to=2026-12-01T00:00:00Z', token: 'teacher' });
    expect(wide.json()).toMatchObject({ code: 'range_too_large' });
  });

  it('does not shadow the admin /teachers/:id routes', async () => {
    const res = await h.call({ method: 'GET', url: '/teachers/00000000-0000-4000-8000-0000000000b1', token: 'teacher' });
    expect(res.statusCode).toBe(403);
  });
});
