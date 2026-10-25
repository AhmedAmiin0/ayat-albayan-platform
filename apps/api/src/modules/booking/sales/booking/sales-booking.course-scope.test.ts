import { bookingRequestSchema, type BookingRequest } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { readerOf } from '../../../../common/settings/settings.fakes';
import type { SalesOwnership } from '../../../sales/sales-ownership';
import type { SalesQueries } from '../../../sales/sales.queries';
import { errorCode } from '../../../../common/http/errors';
import { BookingSettings } from '../../booking.settings';
import { SalesBookingScope } from './sales-booking.ownership';
import type { TrialDateQueries } from '../../trial-date/trial-date.queries';
import { assertBookingScope } from './sales-booking.scope';

// The assistant's course (owner 2026-10-18): kind 'package' with self.sales_money, one student of hers.

const TEACHER = 'a0000000-0000-4000-8000-000000000001';
const LEAD = 'b0000000-0000-4000-8000-000000000001';
const S1 = 'c0000000-0000-4000-8000-000000000001';
const S2 = 'c0000000-0000-4000-8000-000000000002';
const USER: AuthUser = { id: 'b1000000-0000-4000-8000-00000000000b', email: null, role: 'sales' };
const OWN: SalesOwnership = { leadIds: [LEAD], guardianIds: ['g1'], studentIds: [S1], phones: ['+966551110000'] };
const RULE = { teacherId: TEACHER, byday: [0, 2], startTimeLocal: '17:00', tz: 'Asia/Riyadh', durationMin: 45, startsOn: '2026-10-11' };
const course = (over: object = {}): BookingRequest => bookingRequestSchema.parse({ ...RULE, package: '8', studentIds: [S1], ...over });
const code = (fn: () => void): string | null => {
  try {
    fn();
    return null;
  } catch (e) {
    return errorCode(e) ?? 'other';
  }
};

describe('assertBookingScope — a course (R-ASST-01)', () => {
  it('her one student with self.sales_money passes, with per-day times too', () => {
    expect(code(() => assertBookingScope(course(), OWN, true))).toBeNull();
    expect(code(() => assertBookingScope(course({ dayTimes: [{ weekday: 2, startTimeLocal: '19:30' }] }), OWN, true))).toBeNull();
  });

  it('without self.sales_money a package is still 403 kind_not_allowed; a makeup always is', () => {
    expect(code(() => assertBookingScope(course(), OWN))).toBe('kind_not_allowed');
    const makeup = course({ package: undefined, kind: 'makeup', makeupOfLessonId: 'd0000000-0000-4000-8000-000000000001' });
    expect(code(() => assertBookingScope(makeup, OWN, true))).toBe('kind_not_allowed');
  });

  it('exactly one existing student: two, a lead or a new family are 403 course_one_student', () => {
    expect(code(() => assertBookingScope(course({ studentIds: [S1, S2] }), OWN, true))).toBe('course_one_student');
    expect(code(() => assertBookingScope(course({ leadId: LEAD }), OWN, true))).toBe('course_one_student');
    const fresh = bookingRequestSchema.parse({
      ...RULE, package: '8', leadId: LEAD, newStudent: { name: 'ياسمين', tz: 'Asia/Riyadh' },
      guardian: { name: 'أم ياسمين', phone_e164: '+966551110000', tz: 'Asia/Riyadh' },
    });
    expect(code(() => assertBookingScope(fresh, OWN, true))).toBe('course_one_student');
  });

  it('another assistant’s student is 403 not_your_student, and null ownership never means «any» for a course', () => {
    expect(code(() => assertBookingScope(course({ studentIds: [S2] }), OWN, true))).toBe('not_your_student');
    expect(code(() => assertBookingScope(course(), null, true))).toBe('not_your_student');
  });

  it('override, meeting link and invoice stay 403 on a course', () => {
    expect(code(() => assertBookingScope(course({ override: { reason: 'سبب' } }), OWN, true))).toBe('override_not_allowed');
    expect(code(() => assertBookingScope(course({ meetingLink: 'https://meet.example/x' }), OWN, true))).toBe('meeting_link_not_allowed');
    expect(code(() => assertBookingScope(course({ invoice: { source: 'upload', path: 'x/a.pdf' } }), OWN, true))).toBe('invoice_not_allowed');
  });

  it('a trial is unchanged by the permission', () => {
    expect(code(() => assertBookingScope(course({ package: 'trial', byday: [0] }), OWN, true))).toBeNull();
    expect(code(() => assertBookingScope(course({ package: 'trial', byday: [0], studentIds: [S2] }), null, true))).toBeNull();
  });
});

describe('SalesBookingScope.forRequest — a course always reads her ownership', () => {
  const scopeWith = (on: boolean) => {
    const sales = { ownership: vi.fn(async (): Promise<SalesOwnership> => OWN) };
    return { sales, scope: new SalesBookingScope(sales as unknown as SalesQueries, readerOf(BookingSettings, { sales_auto_assign: on }), {} as unknown as TrialDateQueries) };
  };

  it('auto-assign OFF: a course gets her ownership, a trial gets null', async () => {
    const { sales, scope } = scopeWith(false);
    expect(await scope.forRequest(course(), USER)).toEqual(OWN);
    expect(await scope.forRequest(course({ package: 'trial', byday: [0] }), USER)).toBeNull();
    expect(sales.ownership).toHaveBeenCalledTimes(1);
  });

  it('owned: her ownership whatever the switch', async () => {
    const { scope } = scopeWith(false);
    expect(await scope.owned(USER)).toEqual(OWN);
  });
});
