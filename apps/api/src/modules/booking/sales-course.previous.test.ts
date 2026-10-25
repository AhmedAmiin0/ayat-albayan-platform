import { bookingRequestSchema, type CourseSubscription } from '@ab/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../common/auth/verify-token';
import type { CourseRuleRow } from './core/course-read';
import type { SalesBookingScope } from './sales-booking.ownership';
import type { SalesCourseQueries } from './sales-course.queries';
import type { CourseRule } from './sales-course.rules';
import { SalesCourse } from './sales-course.service';

// A renewal continues the course on the same days (owner 2026-10-18, «تابِع بنفس الأيام»).
const S1 = 'c0000000-0000-4000-8000-000000000001';
const USER: AuthUser = { id: 'b1000000-0000-4000-8000-00000000000b', email: null, role: 'sales' };
const NEW_SUB: CourseSubscription = { id: 'sub2', package: '8', duration: 45, lessons_total: 8, starts_on: '2026-10-20' };
const STUDENT = { id: S1, code: 'AB-0001', name: 'سهيلة', tz: 'Asia/Riyadh', program: 'quran' as const, teacher_gender_pref: null, teacher_id: 't1' };
// The first course: Sun 17:00 + Tue 19:30, still running until Tue 3 Nov.
const OLD: CourseRuleRow[] = [
  { id: 'r1', subscription_id: 'sub1', teacher_id: 't1', duration_min: 45, start_time_local: '17:00:00', tz: 'Asia/Riyadh', byday: [0], starts_on: '2026-10-04', ends_on: '2026-11-03', status: 'active', first_rule_id: null, sub: { package: '8', lessons_total: 8 }, teacher: { tz: 'Africa/Cairo' } },
  { id: 'r2', subscription_id: 'sub1', teacher_id: 't1', duration_min: 45, start_time_local: '19:30:00', tz: 'Asia/Riyadh', byday: [2], starts_on: '2026-10-06', ends_on: '2026-11-03', status: 'active', first_rule_id: 'r1', sub: { package: '8', lessons_total: 8 }, teacher: { tz: 'Africa/Cairo' } },
];
const RULES: CourseRule[] = OLD.map((r) => ({ starts_on: r.starts_on, ends_on: r.ends_on, package: '8' }));

function setup(booked = false) {
  const queries = {
    student: vi.fn().mockResolvedValue(STUDENT),
    subscription: vi.fn().mockResolvedValue(NEW_SUB),
    rules: vi.fn().mockResolvedValue(RULES),
    courseRules: vi.fn().mockResolvedValue(OLD),
    subscriptionBooked: vi.fn().mockResolvedValue(booked),
    requested: vi.fn().mockResolvedValue(false),
  };
  const scope = { owned: vi.fn().mockResolvedValue({ leadIds: [], guardianIds: [], studentIds: [S1], phones: [] }) };
  return new SalesCourse(queries as unknown as SalesCourseQueries, scope as unknown as SalesBookingScope);
}

describe('SalesCourse — the renewal of a running course', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-18T08:00:00Z'), toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('view: previous = the first course (its days, teacher, last day); not blocked although it still runs', async () => {
    const view = await setup().view(S1, USER);
    expect(view.blocked).toBeNull();
    expect(view.previous).toEqual(
      expect.objectContaining({
        subscriptionId: 'sub1',
        teacherId: 't1',
        endsOn: '2026-11-03',
        days: [
          { weekday: 0, startTimeLocal: '17:00' },
          { weekday: 2, startTimeLocal: '19:30' },
        ],
      }),
    );
    expect(view.current?.subscriptionId).toBe('sub1');
  });

  it('view: once the new subscription has its course, no previous (and course_exists)', async () => {
    const view = await setup(true).view(S1, USER);
    expect([view.previous, view.blocked]).toEqual([null, 'course_exists']);
  });

  it('the same days from Sun 8 Nov book on the NEW subscription, the audit naming the course it follows', async () => {
    const body = { teacherId: 'a0000000-0000-4000-8000-000000000001', byday: [0, 2], startTimeLocal: '17:00', dayTimes: [{ weekday: 2, startTimeLocal: '19:30' }], tz: 'Asia/Riyadh', durationMin: 45, startsOn: '2026-11-08', package: '8', studentIds: [S1] };
    const opts = await setup().options(bookingRequestSchema.parse(body));
    expect(opts.course).toEqual({ package: '8', subscriptionId: 'sub2', follows: 'sub1' });
    // Sun 8 … the 8th lesson Tue 1 Dec.
    expect(opts.endsOn).toBe('2026-12-01');
  });

  it('days that overlap the running course are still refused (course_exists)', async () => {
    const body = { teacherId: 'a0000000-0000-4000-8000-000000000001', byday: [0, 2], startTimeLocal: '17:00', tz: 'Asia/Riyadh', durationMin: 45, startsOn: '2026-10-25', package: '8', studentIds: [S1] };
    const e: unknown = await setup().options(bookingRequestSchema.parse(body)).catch((x: unknown) => x);
    expect(e).toMatchObject({ response: { code: 'course_exists' } });
  });
});
