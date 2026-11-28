import { describe, expect, it } from 'vitest';
import { salesTeacherOverviewRoutes as routes } from '../teacher-overview.routes';

const ID = 'c1111111-1111-4111-8111-111111111111';
const STUDENT = { name: 'سهيلة', code: 'AB-1001' };
const SLOT = { rule_id: ID, weekday: 0, time: '16:00', duration_min: 30, students: [STUDENT] };
const TOTALS = {
  held: 1,
  student_absent: 0,
  cancelled_by_teacher: 0,
  cancelled_by_admin: 0,
  other: 0,
};
const LESSON = {
  lesson_id: ID,
  starts_at: '2026-11-20T13:00:00Z',
  status: 'completed',
  students: [STUDENT],
};
const OVERVIEW = { weekly: [SLOT], attendance: { days: 30, totals: TOTALS, latest: [LESSON] } };

describe('salesTeacherOverviewRoutes', () => {
  it('keeps the path the api serves today', () => {
    const r = routes.overview;
    expect(`${r.method} ${r.path}`).toBe('GET /sales/teachers/:id/overview');
  });

  it('names a teacher by a uuid', () => {
    expect(routes.overview.params.safeParse({ id: 'x' }).success).toBe(false);
  });

  it('answers the weekly slots and the attendance, a slot with or without its next start', () => {
    expect(routes.overview.response.parse(OVERVIEW)).toEqual(OVERVIEW);
    const slot = { ...SLOT, at: '2026-11-29T13:00:00Z' };
    const withAt = { ...OVERVIEW, weekly: [slot] };
    expect(routes.overview.response.parse(withAt)).toEqual(withAt);
  });

  it('refuses a lesson status outside the catalog', () => {
    const lesson = { ...LESSON, status: 'gone' };
    const bad = { ...OVERVIEW, attendance: { ...OVERVIEW.attendance, latest: [lesson] } };
    expect(routes.overview.response.safeParse(bad).success).toBe(false);
  });
});
