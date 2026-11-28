import { describe, expect, it } from 'vitest';
import { lessonListRoutes as routes } from '..';

const TEACHER = '00000000-0000-4000-8000-000000000001';
const FROM = '2026-10-04T00:00:00+03:00';
const TO = '2026-10-11T00:00:00+03:00';
const span = { starts_at: FROM, ends_at: TO };
const teacher = {
  id: TEACHER,
  display_name_ar: 'T',
  gender: 'female',
  programs: ['quran'],
  tz: 'Africa/Cairo',
  status: 'active',
  meeting_link: null,
  students_count: 3,
  max_students: null,
  windows: [span],
  time_off: [{ ...span, id: TEACHER, reason: null }],
  free: [span],
};

describe('lessonListRoutes (R-SCH-01, R-SCH-09)', () => {
  it.each([
    ['list', 'GET /lessons'],
    ['day', 'GET /lessons/day'],
    ['overview', 'GET /lessons/overview'],
  ] as const)('%s keeps its path, read by lessons.read, tagged lessons', (key, wire) => {
    const route = routes[key];
    expect(`${route.method} ${route.path}`).toBe(wire);
    expect([route.permissions, route.tags]).toEqual([['lessons.read'], ['lessons']]);
  });

  it('takes a window with an optional teacher named by uuid, ending after it starts', () => {
    expect(routes.list.query.parse({ from: FROM, to: TO })).toEqual({ from: FROM, to: TO });
    expect(routes.overview.query.safeParse({ from: FROM, to: TO, teacherId: 'x' }).success).toBe(
      false,
    );
    expect(routes.list.query.safeParse({ from: TO, to: FROM }).success).toBe(false);
    expect(routes.list.query.safeParse({ from: FROM }).success).toBe(false);
  });

  it('takes a local day and an optional IANA zone', () => {
    expect(routes.day.query.parse({ date: '2026-10-04' })).toEqual({ date: '2026-10-04' });
    expect(routes.day.query.safeParse({ date: '2026-10-04', tz: 'Mars/Base' }).success).toBe(false);
    expect(routes.day.query.safeParse({ date: '4/10/2026' }).success).toBe(false);
  });

  it('answers the overview with its teachers, spans and lessons', () => {
    const overview = { from: FROM, to: TO, teachers: [teacher], lessons: [] };
    expect(routes.overview.response.parse(overview)).toEqual(overview);
    const unknown = { ...overview, teachers: [{ ...teacher, status: 'retired' }] };
    expect(routes.overview.response.safeParse(unknown).success).toBe(false);
  });

  it('answers the lists with lesson views only', () => {
    expect(routes.list.response.parse([])).toEqual([]);
    expect(routes.day.response.safeParse([{ id: TEACHER }]).success).toBe(false);
  });
});
