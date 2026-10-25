import { bookingRequestSchema, type BookingRequest } from '@ab/shared';
import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../common/auth/verify-token';
import { readerOf } from '../../common/settings/settings.fakes';
import { NO_OWNERSHIP, type SalesOwnership } from '../sales/sales-ownership';
import type { SalesQueries } from '../sales/sales.queries';
import { errorCode } from '../../common/http/errors';
import type { BookingService } from './booking.service';
import { BookingSettings } from './booking.settings';
import { SalesBookingScope } from './sales-booking.ownership';
import type { TrialDateQueries } from './trial-date.queries';
import { assertBookingScope, assertOwnStudents, scopeDuplicates } from './sales-booking.scope';
import { SalesBookingService } from './sales-booking.service';
import type { SalesCourse } from './sales-course.service';

// settings.sales_auto_assign OFF (owner 2026-10-12): /sales/booking checks no ownership (own = null);
// the four trial-only rules still hold. ON keeps today's rules (sales-booking.scope.test.ts).

const TEACHER = 'a0000000-0000-4000-8000-000000000001';
const OTHER_LEAD = 'b0000000-0000-4000-8000-000000000002';
const S1 = 'c0000000-0000-4000-8000-000000000001';
const S2 = 'c0000000-0000-4000-8000-000000000002';
const USER: AuthUser = { id: 'b1000000-0000-4000-8000-00000000000b', email: null, role: 'sales' };
const OWN: SalesOwnership = { leadIds: [], guardianIds: [], studentIds: [S1], phones: [] };
const RULE = { teacherId: TEACHER, byday: [0], startTimeLocal: '17:00', tz: 'Asia/Riyadh', durationMin: 45, startsOn: '2026-10-11', package: 'trial' };
const STRANGER = { name: 'أم ياسمين', phone_e164: '+966559999999', tz: 'Asia/Riyadh' };

const existing = (over: object = {}): BookingRequest => bookingRequestSchema.parse({ ...RULE, studentIds: [S2], ...over });
const fresh = (over: object = {}): BookingRequest =>
  bookingRequestSchema.parse({ ...RULE, leadId: OTHER_LEAD, newStudent: { name: 'ياسمين', tz: 'Asia/Riyadh' }, guardian: STRANGER, ...over });
const code = (fn: () => void): string | null => {
  try {
    fn();
    return null;
  } catch (e) {
    return errorCode(e) ?? 'other';
  }
};

describe('assertBookingScope with own = null (sales_auto_assign OFF)', () => {
  it('any lead, any typed guardian phone and any student pass', () => {
    expect(code(() => assertBookingScope(fresh(), null))).toBeNull();
    expect(code(() => assertBookingScope(existing(), null))).toBeNull();
    expect(code(() => assertBookingScope(existing({ studentIds: [S1, S2], leadId: OTHER_LEAD }), null))).toBeNull();
  });

  it('the trial-only rules still hold: no override, package, makeup, meeting link or invoice', () => {
    expect(code(() => assertBookingScope(fresh({ override: { reason: 'سبب' } }), null))).toBe('override_not_allowed');
    expect(code(() => assertBookingScope(fresh({ package: '8' }), null))).toBe('kind_not_allowed');
    const makeup = existing({ package: undefined, kind: 'makeup', makeupOfLessonId: 'd0000000-0000-4000-8000-000000000001' });
    expect(code(() => assertBookingScope(makeup, null))).toBe('kind_not_allowed');
    expect(code(() => assertBookingScope(existing({ meetingLink: 'https://meet.example/x' }), null))).toBe('meeting_link_not_allowed');
    expect(code(() => assertBookingScope(existing({ invoice: { source: 'upload', path: 'invoices/x.pdf' } }), null))).toBe('invoice_not_allowed');
  });

  it('null is not «owns nothing»: NO_OWNERSHIP still refuses the same requests', () => {
    expect(code(() => assertBookingScope(fresh(), NO_OWNERSHIP))).toBe('not_your_lead');
    expect(code(() => assertBookingScope(existing(), NO_OWNERSHIP))).toBe('not_your_student');
  });

  it('assertOwnStudents: any student while OFF', () => {
    expect(code(() => assertOwnStudents([S1, S2], null))).toBeNull();
    expect(code(() => assertOwnStudents([S2], OWN))).toBe('not_your_student');
  });

  it('scopeDuplicates: every child is listed, still as id and name only', () => {
    const dup = new HttpException({ code: 'duplicate_student', message: 'duplicate_student', guardian_id: 'g1', candidates: [{ id: S1, name: 'ياسمين', notes: 'سر' }, { id: S2, name: 'ياسمينة', notes: 'سر' }] }, 409);
    const out = scopeDuplicates(dup, null);
    expect(out).toBeInstanceOf(HttpException);
    expect((out as HttpException).getResponse()).toEqual({ code: 'duplicate_student', message: 'duplicate_student', candidates: [{ id: S1, name: 'ياسمين' }, { id: S2, name: 'ياسمينة' }] });
  });
});

const scopeWith = (on: boolean) => {
  const sales = { ownership: vi.fn(async (): Promise<SalesOwnership> => OWN) };
  return { sales, scope: new SalesBookingScope(sales as unknown as SalesQueries, readerOf(BookingSettings, { sales_auto_assign: on }), {} as unknown as TrialDateQueries) };
};

describe('SalesBookingScope.of: the switch decides', () => {
  it('ON: her ownership (ownershipOf by her id)', async () => {
    const { sales, scope } = scopeWith(true);
    expect(await scope.of(USER)).toEqual(OWN);
    expect(sales.ownership).toHaveBeenCalledWith(USER.id);
  });

  it('OFF: null, and her ownership is never read', async () => {
    const { sales, scope } = scopeWith(false);
    expect(await scope.of(USER)).toBeNull();
    expect(sales.ownership).not.toHaveBeenCalled();
  });

  it('a failed settings read fails the call (no silent OFF)', async () => {
    const settings = readerOf(BookingSettings);
    vi.spyOn(settings, 'read').mockRejectedValue(new Error('settings down'));
    const scope = new SalesBookingScope({ ownership: vi.fn() } as unknown as SalesQueries, settings, {} as unknown as TrialDateQueries);
    await expect(scope.of(USER)).rejects.toThrow('settings down');
  });
});

describe('SalesBookingService.book: OFF books any lead, ON still refuses it', () => {
  const run = (on: boolean) => {
    const { sales, scope } = scopeWith(on);
    sales.ownership.mockResolvedValue(NO_OWNERSHIP);
    const booking = { book: vi.fn(), check: vi.fn() };
    booking.book.mockResolvedValue({ rule_id: 'r1', student_ids: ['n1'], guardian_ids: ['g1'], lessons: [], message_ids: [], invoice_id: null });
    return { booking, svc: new SalesBookingService(scope, booking as unknown as BookingService, {} as unknown as SalesCourse) };
  };

  it('OFF: a lead that is not hers books, with HER id as the actor (brought_by credits her)', async () => {
    const { booking, svc } = run(false);
    await svc.book(fresh(), USER);
    expect(booking.book).toHaveBeenCalledWith(expect.objectContaining({ leadId: OTHER_LEAD }), USER.id);
  });

  it('ON: the same request is 403 not_your_lead and nothing is booked', async () => {
    const { booking, svc } = run(true);
    await expect(svc.book(fresh(), USER)).rejects.toMatchObject({ response: { code: 'not_your_lead' } });
    expect(booking.book).not.toHaveBeenCalled();
  });

  it('a trial whose first lesson already passed: 400 date_in_past, nothing booked (review M3)', async () => {
    const { booking, svc } = run(false);
    const past = fresh({ startsAt: new Date(Date.now() - 60_000).toISOString() });
    await expect(svc.book(past, USER)).rejects.toMatchObject({ response: { code: 'date_in_past' } });
    expect(booking.book).not.toHaveBeenCalled();
    await svc.book(fresh({ startsAt: new Date(Date.now() + 3_600_000).toISOString() }), USER);
    expect(booking.book).toHaveBeenCalledTimes(1);
  });
});
