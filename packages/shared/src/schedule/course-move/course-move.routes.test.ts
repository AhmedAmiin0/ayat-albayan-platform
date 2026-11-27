import { routePath } from '@ab/core';
import { describe, expect, it } from 'vitest';
import { courseTeacherRoutes, courseTimesRoutes } from './course-move.routes';

const STUDENT = 'e1111111-1111-4111-8111-111111111111';
const SUB = 'e2222222-2222-4222-8222-222222222222';
const TEACHER = 'e3333333-3333-4333-8333-333333333333';
const REQ = 'e4444444-4444-4444-8444-444444444444';
const LOOSE_HEX = '3f1c2a7e-9b4d-0e1a-0c2f-1d2e3f4a5b6c';
const MOVE = {
  subscriptionId: SUB,
  byday: [2],
  startTimeLocal: '17:00',
  startsOn: '2026-12-01',
  startsAt: '2026-12-01T15:00:00Z',
};
const lines = (routes: Record<string, { method: string; path: string }>): string[] =>
  Object.values(routes).map((r) => `${r.method} ${r.path}`);

describe('course move routes', () => {
  it('keeps the profile times paths the api serves today', () => {
    expect(lines(courseTimesRoutes)).toEqual([
      'GET /students/:id/course-times/change',
      'POST /students/:id/course-times/change/check',
      'POST /students/:id/course-times/change',
    ]);
    const path = routePath(courseTimesRoutes.check, { id: STUDENT });
    expect(path).toBe(`/students/${STUDENT}/course-times/change/check`);
  });

  it('keeps the profile teacher paths, with its teachers to pick from', () => {
    expect(lines(courseTeacherRoutes)).toEqual([
      'GET /students/:id/course-teacher/change',
      'POST /students/:id/course-teacher/change/check',
      'POST /students/:id/course-teacher/change',
      'GET /students/:id/course-teacher/teachers',
    ]);
  });

  it('keeps the strict uuid check on the student id', () => {
    const { params } = courseTeacherRoutes.teachers;
    expect(params.safeParse({ id: STUDENT }).success).toBe(true);
    expect(params.safeParse({ id: LOOSE_HEX }).success).toBe(false);
  });

  it('reads the current package when no package is named', () => {
    expect(courseTimesRoutes.view.query.parse({})).toEqual({});
    expect(courseTimesRoutes.view.query.parse({ subscriptionId: SUB })).toEqual({
      subscriptionId: SUB,
    });
    expect(courseTimesRoutes.view.query.safeParse({ subscriptionId: 'x' }).success).toBe(false);
  });

  it('needs the new teacher on the teacher change only', () => {
    expect(courseTimesRoutes.check.body.safeParse(MOVE).success).toBe(true);
    expect(courseTeacherRoutes.check.body.safeParse(MOVE).success).toBe(false);
    const withTeacher = { ...MOVE, teacherId: TEACHER };
    expect(courseTeacherRoutes.check.body.parse(withTeacher)).toMatchObject(withTeacher);
  });

  it('needs the request id on the change, not on the check', () => {
    expect(courseTimesRoutes.change.body.safeParse(MOVE).success).toBe(false);
    const change = { ...MOVE, clientRequestId: REQ };
    expect(courseTimesRoutes.change.body.parse(change)).toMatchObject(change);
  });

  it('answers the clashes and what is left, then the new rules', () => {
    const check = { conflicts: [], remaining: 6, endsOn: '2027-01-30' };
    expect(courseTimesRoutes.check.response.parse(check)).toEqual(check);
    const result = { subscriptionId: SUB, ruleIds: [REQ], endsOn: null };
    expect(courseTeacherRoutes.change.response.parse(result)).toEqual(result);
    expect(courseTeacherRoutes.change.response.safeParse({ subscriptionId: SUB }).success).toBe(
      false,
    );
  });

  it('refuses a course view without its next lesson field', () => {
    const view = courseTimesRoutes.view.response;
    expect(view.safeParse({ student: {}, course: {} }).success).toBe(false);
  });
});
