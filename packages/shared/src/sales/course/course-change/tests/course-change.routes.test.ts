import { describe, expect, it } from 'vitest';
import { courseChangeRoutes } from '../course-change.routes';

const SUB = '11111111-1111-4111-8111-111111111111';
const COURSE = {
  subscriptionId: SUB,
  teacherId: '22222222-2222-4222-8222-222222222222',
  teacherTz: 'Africa/Cairo',
  durationMin: 45,
  tz: 'Europe/London',
  startsOn: '2026-12-01',
  endsOn: '2027-01-30',
  running: true,
  opensOn: '2026-12-01',
  days: [{ weekday: 2, startTimeLocal: '17:00' }],
  lessonsTotal: 8,
  perWeek: 2,
};
const STUDENT_ID = '33333333-3333-4333-8333-333333333333';
const STUDENT = { id: STUDENT_ID, name: 'S', code: 'AB-0001', tz: 'UTC' };

describe('courseChangeRoutes (R-SCH-04)', () => {
  it('keeps the paths the api serves today', () => {
    const lines = Object.values(courseChangeRoutes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /booking/course/change',
      'POST /booking/course/change/check',
      'POST /booking/course/change',
    ]);
  });

  it('answers the course to change with its student', () => {
    const view = { student: STUDENT, course: COURSE };
    expect(courseChangeRoutes.view.response.parse(view)).toEqual(view);
  });

  it('refuses a course with a length the slots never offer', () => {
    const view = { student: STUDENT, course: { ...COURSE, durationMin: 50 } };
    expect(courseChangeRoutes.view.response.safeParse(view).success).toBe(false);
  });

  it('answers the check with its clashes, lessons left and new last day', () => {
    const check = { conflicts: [], remaining: 6, endsOn: '2027-01-30' };
    expect(courseChangeRoutes.check.response.parse(check)).toEqual(check);
    const noEnd = { conflicts: [], remaining: 6 };
    expect(courseChangeRoutes.check.response.safeParse(noEnd).success).toBe(false);
  });

  it('answers the change with the new rules and a last day that may be unknown', () => {
    const result = { subscriptionId: SUB, ruleIds: [SUB], endsOn: null };
    expect(courseChangeRoutes.change.response.parse(result)).toEqual(result);
    const noRules = { subscriptionId: SUB, endsOn: null };
    expect(courseChangeRoutes.change.response.safeParse(noRules).success).toBe(false);
  });

  it('asks the view for one package id', () => {
    const { query } = courseChangeRoutes.view;
    expect(query.safeParse({}).success).toBe(false);
    expect(query.parse({ subscriptionId: SUB })).toEqual({ subscriptionId: SUB });
  });
});
