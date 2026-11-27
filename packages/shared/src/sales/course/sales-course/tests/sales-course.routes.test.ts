import { describe, expect, it } from 'vitest';
import { salesCourseRoutes } from '../sales-course.routes';

const STUDENT_ID = '33333333-3333-4333-8333-333333333333';
const SUB = '11111111-1111-4111-8111-111111111111';
const STUDENT = {
  id: STUDENT_ID,
  code: 'AB-0001',
  name: 'S',
  tz: 'Europe/London',
  program: 'quran',
  teacher_gender_pref: null,
  teacher_id: null,
};
const SUBSCRIPTION = {
  id: SUB,
  package: '8',
  duration: 45,
  lessons_total: 8,
  lessons_used_before: 0,
  starts_on: '2026-12-01',
};
const VIEW = {
  student: STUDENT,
  subscription: SUBSCRIPTION,
  perWeek: 2,
  blocked: null,
  previous: null,
  current: null,
  hold: false,
  draft: null,
};

describe('salesCourseRoutes (R-ASST-01)', () => {
  it('keeps the paths the api serves today', () => {
    const lines = Object.values(salesCourseRoutes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /sales/booking/course',
      'POST /sales/booking/course/change/check',
      'PUT /sales/booking/course/draft',
      'POST /sales/booking/course/change',
    ]);
  });

  it('answers the wizard its student, package, days a week and draft', () => {
    expect(salesCourseRoutes.view.response.parse(VIEW)).toEqual(VIEW);
    const saved = { ...VIEW, hold: true, draft: { saved_at: '2026-11-27T10:00:00Z' } };
    expect(salesCourseRoutes.view.response.parse(saved)).toEqual(saved);
  });

  it('answers a student without a package with why she cannot book', () => {
    const none = { ...VIEW, subscription: null, perWeek: null, blocked: 'subscription_required' };
    expect(salesCourseRoutes.view.response.parse(none)).toEqual(none);
  });

  it('refuses a block reason, program or lesson length the wizard does not know', () => {
    const { response } = salesCourseRoutes.view;
    expect(response.safeParse({ ...VIEW, blocked: 'unpaid' }).success).toBe(false);
    const program = { ...VIEW, student: { ...STUDENT, program: 'math' } };
    expect(response.safeParse(program).success).toBe(false);
    const length = { ...VIEW, subscription: { ...SUBSCRIPTION, duration: 50 } };
    expect(response.safeParse(length).success).toBe(false);
  });

  it('asks the view for one student id', () => {
    const { query } = salesCourseRoutes.view;
    expect(query.safeParse({}).success).toBe(false);
    expect(query.safeParse({ studentId: 'x' }).success).toBe(false);
    expect(query.parse({ studentId: STUDENT_ID })).toEqual({ studentId: STUDENT_ID });
  });

  it('answers a saved draft or the course booked at once', () => {
    const { response } = salesCourseRoutes.draft;
    const draft = { state: 'draft', saved_at: '2026-11-27T10:00:00Z' };
    expect(response.parse(draft)).toEqual(draft);
    expect(response.safeParse({ state: 'booked' }).success).toBe(false);
  });

  it('lets the assistant in by her money permission, under the booking tag', () => {
    const access = Object.values(salesCourseRoutes).map(({ permissions, tags }) => ({
      permissions,
      tags,
    }));
    const one = { permissions: ['self.sales_money'], tags: ['booking'] };
    expect(access).toEqual([one, one, one, one]);
  });
});
