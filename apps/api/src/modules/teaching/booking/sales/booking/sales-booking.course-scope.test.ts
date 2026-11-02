import { bookingRequestSchema, type BookingRequest } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import type { SalesOwnership } from '@/modules/sales/sales/sales-ownership';
import { errorCode } from '@/common/http/errors';
import { assertBookingScope } from './sales-booking.scope';

// The assistant's course (owner 2026-10-18): kind 'package' with self.sales_money, one student of hers.

const TEACHER = 'a0000000-0000-4000-8000-000000000001';
const LEAD = 'b0000000-0000-4000-8000-000000000001';
const S1 = 'c0000000-0000-4000-8000-000000000001';
const S2 = 'c0000000-0000-4000-8000-000000000002';
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

  it('another assistant’s student is 403 not_your_student while ownership is checked; null (the rule off) = any', () => {
    expect(code(() => assertBookingScope(course({ studentIds: [S2] }), OWN, true))).toBe('not_your_student');
    expect(code(() => assertBookingScope(course({ studentIds: [S2] }), null, true))).toBeNull();
  });

  it("grant 'any' (sales.renew_any, docs/16 row 38): any one student, the other rules still hold", () => {
    expect(code(() => assertBookingScope(course({ studentIds: [S2] }), OWN, 'any'))).toBeNull();
    expect(code(() => assertBookingScope(course(), null, 'any'))).toBeNull();
    expect(code(() => assertBookingScope(course({ studentIds: [S1, S2] }), OWN, 'any'))).toBe('course_one_student');
    expect(code(() => assertBookingScope(course({ override: { reason: 'سبب' } }), OWN, 'any'))).toBe('override_not_allowed');
    expect(code(() => assertBookingScope(course({ invoice: { source: 'upload', path: 'x/a.pdf' } }), OWN, 'any'))).toBe('invoice_not_allowed');
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
