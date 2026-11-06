import { bookingRequestSchema, type CourseSubscription } from '@ab/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@/common/auth/verify-token';
import type { CourseRuleRow } from '@/modules/teaching/booking/core/course-read';
import type { SalesBookingScope } from '@/modules/teaching/booking/sales/booking/sales-booking.ownership';
import type { SalesCourseRepo } from './sales-course.repo';
import type { CourseRule } from './sales-course.rules';
import type { CourseDraftRepo } from '@/modules/teaching/booking/sales/course-draft/course-draft.repo';
import { SalesCourse } from './sales-course.service';

/** No payment link held and no draft (owner 2026-11-06). */
const noDrafts = { held: async () => false, get: async () => null };

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

function setup(booked = false, drafts: object = noDrafts) {
  const queries = {
    student: vi.fn().mockResolvedValue(STUDENT),
    subscription: vi.fn().mockResolvedValue(NEW_SUB),
    rules: vi.fn().mockResolvedValue(RULES),
    courseRules: vi.fn().mockResolvedValue(OLD),
    subscriptionBooked: vi.fn().mockResolvedValue(booked),
    requested: vi.fn().mockResolvedValue(false),
  };
  const scope = { of: vi.fn().mockResolvedValue({ leadIds: [], guardianIds: [], studentIds: [S1], phones: [] }) };
  const asScope = scope as unknown as SalesBookingScope;
  return new SalesCourse(queries as unknown as SalesCourseRepo, asScope, drafts as CourseDraftRepo);
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

  it('view: a renewal held for its payment with saved picks: hold, and those picks prefill (not the old days)', async () => {
    const request = bookingRequestSchema.parse({
      kind: 'package', package: '8', studentIds: [S1], teacherId: 'd0000000-0000-4000-8000-000000000001',
      byday: [1, 3], startTimeLocal: '18:00', tz: 'Asia/Riyadh', durationMin: 45, startsOn: '2026-11-08',
    });
    const draft = { subscriptionId: 'sub2', request, savedBy: 'a1', savedAt: '2026-10-18T07:00:00.000Z' };
    const held = { held: async () => true, get: async () => draft };
    const view = await setup(false, held).view(S1, USER);
    expect(view).toMatchObject({ hold: true, draft: { saved_at: draft.savedAt } });
    const days = [{ weekday: 1 }, { weekday: 3 }];
    expect(view.previous).toMatchObject({ subscriptionId: 'sub2', startsOn: '2026-11-08', days });
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
