import { describe, expect, it } from 'vitest';
import { salesStudentDetails, salesStudentSubscription } from '../../../testing/sales/sales-student';
import { salesStudentFileRoutes as routes } from '../student-file.routes';

const ID = '11111111-1111-4111-8111-111111111111';
const accepts = (v: unknown): boolean => routes.details.response.safeParse(v).success;

describe('salesStudentFileRoutes.details', () => {
  it('keeps the path, the permission and the tag the api serves today', () => {
    const { method, path, permissions, tags } = routes.details;
    expect([method, path, permissions, tags]).toEqual([
      'GET',
      '/sales/students/:id',
      ['self.sales_academy'],
      ['sales'],
    ]);
  });

  it('takes one uuid', () => {
    expect(routes.details.params.parse({ id: ID })).toEqual({ id: ID });
    expect(routes.details.params.safeParse({ id: 'nope' }).success).toBe(false);
  });

  it('accepts a full answer and one from an old api without the late blocks', () => {
    const full = salesStudentDetails();
    expect(routes.details.response.parse(full)).toEqual(full);
    const { schedule: _s, trial: _t, package: _p, family: _f, mine: _m, ...old } = full;
    expect(accepts(old)).toBe(true);
  });

  it('keeps a part-paid package and drops a payment or an audit trail', () => {
    const part = { paid: 290, price: 300, due: 10, currency: 'SAR' };
    const sub = { ...salesStudentSubscription({ part_paid: part }), payments: [], note: 'x' };
    const out = routes.details.response.parse(salesStudentDetails({ subscriptions: [sub] }));
    expect(out.subscriptions[0]).toEqual(salesStudentSubscription({ part_paid: part }));
  });

  it('refuses an unknown status, program, attendance kind or trial outcome', () => {
    const base = salesStudentDetails();
    const day = { lesson_id: 'l1', starts_at: '2026-10-11T15:00:00Z', kind: 'late' };
    const trial = {
      lesson_id: 'l9',
      starts_at: '2026-09-01T15:00:00Z',
      status: 'completed',
      outcome: 'maybe',
      teacher_name: null,
    };
    expect(accepts({ ...base, student: { ...base.student, status: 'gone' } })).toBe(false);
    expect(accepts({ ...base, student: { ...base.student, program: 'chess' } })).toBe(false);
    expect(accepts({ ...base, attendance: { ...base.attendance, items: [day] } })).toBe(false);
    expect(accepts({ ...base, trial: [trial] })).toBe(false);
  });

  it('refuses a weekly slot on an eighth day and a meeting link is never kept', () => {
    const slot = {
      rule_id: 'r1',
      byday: [7],
      start_time_local: '16:00',
      tz: 'Asia/Riyadh',
      duration_min: 30,
      teacher: null,
      next: [],
    };
    const weekly = { student_tz: 'Asia/Riyadh', weekly: [slot], upcoming: [] };
    expect(accepts(salesStudentDetails({ schedule: weekly }))).toBe(false);
    const lesson = {
      id: 'l5',
      starts_at: '2026-11-01T15:00:00Z',
      ends_at: '2026-11-01T15:30:00Z',
      status: 'scheduled',
      trial: false,
      makeup: false,
      meeting_link: 'https://meet.example/x',
      teacher: { id: 't1', display_name_ar: 'أبرار', display_name_en: null },
      students: [],
    };
    const schedule = { weekly: [], upcoming: [lesson] };
    const out = routes.details.response.parse({ ...salesStudentDetails(), schedule });
    expect(out.schedule?.upcoming[0]).not.toHaveProperty('meeting_link');
  });
});
