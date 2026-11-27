import { describe, expect, it } from 'vitest';
import { teacherStudentFileRoutes as routes } from '../teacher-student.routes';

const ID = '11111111-1111-4111-8111-111111111111';

describe('teacherStudentFileRoutes', () => {
  it('keeps the paths, the permission and the tag the api serves today', () => {
    const wire = Object.values(routes).map((r) => [r.method, r.path, r.permissions, r.tags]);
    expect(wire).toEqual([
      ['GET', '/teachers/me/students/:id', ['self.teacher'], ['teachers']],
      ['GET', '/teachers/me/students/:id/attendance', ['self.teacher'], ['teachers']],
    ]);
  });

  it('takes a uuid and an optional YYYY-MM month', () => {
    expect(routes.head.params.safeParse({ id: 'nope' }).success).toBe(false);
    expect(routes.attendance.params.parse({ id: ID })).toEqual({ id: ID });
    expect(routes.attendance.query.parse({})).toEqual({});
    expect(routes.attendance.query.parse({ month: '2026-11' })).toEqual({ month: '2026-11' });
    expect(routes.attendance.query.safeParse({ month: '2026-13' }).success).toBe(false);
  });
});
