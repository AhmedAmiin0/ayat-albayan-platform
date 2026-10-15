import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../common/auth/verify-token';
import { bookingRequest, fakePlanner, IDS, leadRequest, NOW } from './booking.fakes';
import type { BookingInvoices } from './booking.invoice';
import type { BookingQueries } from './booking.queries';
import { BookingService } from './booking.service';
import { BookingWriter } from './booking.writer';
import type { SalesBookingScope } from './sales-booking.ownership';
import { SalesBookingService } from './sales-booking.service';
import { fakeTeacherAlert } from './teacher-alert.fakes';

const TEACHER = { id: IDS.teacher, profile_id: 'P1', phone_e164: '+201001234567', tz: 'Africa/Cairo' };
const RESULT = { rule_id: 'R1', student_ids: [IDS.s1], guardian_ids: [IDS.g1], lessons: [{ id: 'L1', starts_at: '2026-10-04T14:00:00.000Z', ends_at: '2026-10-04T14:45:00.000Z' }], message_ids: [], invoice_id: null };

function setup() {
  const deps = fakePlanner();
  deps.queries.createBooking.mockResolvedValue(RESULT);
  const fake = fakeTeacherAlert({ lessons: [{ id: 'L1', starts_at: RESULT.lessons[0]?.starts_at ?? '', teacher: TEACHER }] });
  const invoices = { resolve: vi.fn().mockResolvedValue(null) } as unknown as BookingInvoices;
  const writer = new BookingWriter(deps.queries as unknown as BookingQueries, invoices, fake.after);
  const booking = new BookingService(deps.planner, writer, deps.queries as unknown as BookingQueries);
  return { ...fake, booking, bookingQueries: deps.queries };
}

describe('teacher alert on both booking paths (R-NOT-03)', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('the admin wizard (POST /booking) alerts the teacher once', async () => {
    const { booking, push, queries } = setup();
    await booking.book(bookingRequest(), 'admin-1');
    expect(push.notifyProfiles).toHaveBeenCalledTimes(1);
    expect(queries.queue).toHaveBeenCalledTimes(1);
  });

  it('the assistant’s wizard (POST /sales/booking) alerts the teacher once', async () => {
    const { booking, push } = setup();
    const scope = { of: vi.fn(async () => null) } as unknown as SalesBookingScope;
    const user: AuthUser = { id: 'sales-1', email: null, role: 'sales' };
    await new SalesBookingService(scope, booking).book(leadRequest(), user);
    expect(push.notifyProfiles).toHaveBeenCalledWith(expect.objectContaining({ kind: 'new_student', profileIds: ['P1'] }));
    expect(push.notifyProfiles).toHaveBeenCalledTimes(1);
  });

  it('a replay (same clientRequestId) alerts nobody again', async () => {
    const { booking, push, bookingQueries } = setup();
    bookingQueries.replay.mockResolvedValue(RESULT);
    await booking.book(bookingRequest({ clientRequestId: 'c0000000-0000-4000-8000-0000000000c1' }), 'admin-1');
    expect(push.notifyProfiles).not.toHaveBeenCalled();
  });
});
