import { bookingRequestSchema, type CourseSubscription } from '@ab/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../common/auth/verify-token';
import { errorCode } from '../scheduling/errors';
import type { SalesBookingScope } from './sales-booking.ownership';
import type { SalesCourseQueries } from './sales-course.queries';
import type { CourseRule } from './sales-course.rules';
import { SalesCourse } from './sales-course.service';

const S1 = 'c0000000-0000-4000-8000-000000000001';
const S2 = 'c0000000-0000-4000-8000-000000000002';
const USER: AuthUser = { id: 'b1000000-0000-4000-8000-00000000000b', email: null, role: 'sales' };
const SUB: CourseSubscription = { id: 'sub1', package: '8', duration: 45, lessons_total: 8, starts_on: '2026-10-10' };
const STUDENT = { id: S1, code: 'AB-0001', name: 'سهيلة', tz: 'Asia/Riyadh', program: 'quran' as const, teacher_gender_pref: null, teacher_id: null };
const BODY = {
  teacherId: 'a0000000-0000-4000-8000-000000000001',
  byday: [0, 2],
  startTimeLocal: '17:00',
  dayTimes: [{ weekday: 2, startTimeLocal: '19:30' }],
  tz: 'Asia/Riyadh',
  durationMin: 45,
  startsOn: '2026-10-18',
  package: '8',
  studentIds: [S1],
};

function setup(sub: CourseSubscription | null = SUB, rules: CourseRule[] = []) {
  const queries = {
    student: vi.fn().mockResolvedValue(STUDENT),
    subscription: vi.fn().mockResolvedValue(sub),
    rules: vi.fn().mockResolvedValue(rules),
    courseRules: vi.fn().mockResolvedValue([]),
    subscriptionBooked: vi.fn().mockResolvedValue(false),
    requested: vi.fn().mockResolvedValue(false),
  };
  const scope = { owned: vi.fn().mockResolvedValue({ leadIds: [], guardianIds: [], studentIds: [S1], phones: [] }) };
  const course = new SalesCourse(queries as unknown as SalesCourseQueries, scope as unknown as SalesBookingScope);
  return { queries, scope, course };
}

describe('SalesCourse.options — the course guard (R-ASST-01, R-ASST-04)', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-18T08:00:00Z'), toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('an allowed course: no invoice, every rule ends on the 8th lesson (Sun 18 → Tue 10 Nov), the subscription’s label', async () => {
    const { course, queries } = setup();
    const course8 = { package: '8', subscriptionId: 'sub1', follows: null };
    expect(await course.options(bookingRequestSchema.parse(BODY))).toEqual({ invoiceWaived: true, endsOn: '2026-11-10', course: course8 });
    expect(queries.subscriptionBooked).toHaveBeenCalledWith('sub1');
    expect(queries.subscription).toHaveBeenCalledWith(S1);
    expect(queries.rules).toHaveBeenCalledWith(S1);
  });

  it('a problem is thrown with its code and status', async () => {
    const rejected = async (sub: CourseSubscription | null, rules: CourseRule[] = [], over: object = {}) => {
      const e: unknown = await setup(sub, rules).course.options(bookingRequestSchema.parse({ ...BODY, ...over })).catch((x: unknown) => x);
      return errorCode(e);
    };
    expect(await rejected(null)).toBe('subscription_required');
    expect(await rejected(SUB, [], { byday: [0, 2, 4] })).toBe('days_count_mismatch');
    expect(await rejected(SUB, [{ starts_on: '2026-09-01', ends_on: null, package: '8' }])).toBe('course_exists');
    expect(await rejected(SUB, [], { startsAt: '2026-10-18T07:00:00.000Z' })).toBe('date_in_past');
  });

  it('the end counts from now: Sunday’s lesson already passed → the 8th lesson is Sun 15 Nov (m5)', async () => {
    vi.setSystemTime(new Date('2026-10-18T15:00:00Z'));
    expect((await setup().course.options(bookingRequestSchema.parse(BODY))).endsOn).toBe('2026-11-15');
  });

  it('isReplay: only a clientRequestId that already booked', async () => {
    const { course, queries } = setup();
    expect(await course.isReplay(bookingRequestSchema.parse(BODY))).toBe(false);
    queries.requested.mockResolvedValue(true);
    expect(await course.isReplay(bookingRequestSchema.parse({ ...BODY, clientRequestId: 'e0000000-0000-4000-8000-00000000000e' }))).toBe(true);
  });
});

describe('SalesCourse.view — GET /sales/booking/course', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-18T08:00:00Z'), toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('her student: the subscription, 2 days a week, not blocked', async () => {
    const { course } = setup();
    expect(await course.view(S1, USER)).toEqual({ student: STUDENT, subscription: SUB, perWeek: 2, blocked: null, previous: null, current: null });
  });

  it('a running course blocks (course_exists); no subscription → perWeek null, subscription_required', async () => {
    const running = setup(SUB, [{ starts_on: '2026-09-01', ends_on: '2026-10-18', package: '8' }]);
    expect((await running.course.view(S1, USER)).blocked).toBe('course_exists');
    const sold = setup();
    sold.queries.subscriptionBooked.mockResolvedValue(true);
    expect((await sold.course.view(S1, USER)).blocked).toBe('course_exists');
    const none = await setup(null).course.view(S1, USER);
    expect([none.perWeek, none.blocked]).toEqual([null, 'subscription_required']);
  });

  it('another assistant’s student is 403 not_your_student and nothing is read', async () => {
    const { course, queries } = setup();
    expect(errorCode(await course.view(S2, USER).catch((e: unknown) => e))).toBe('not_your_student');
    expect(queries.student).not.toHaveBeenCalled();
  });
});
