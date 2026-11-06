import { bookingRequestSchema } from '@ab/shared';
import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@/common/auth/verify-token';
import type { BookingService } from '@/modules/teaching/booking/core/booking.service';
import type { SalesCourse } from '@/modules/teaching/booking/sales/course/sales-course.service';
import type { SalesBookingScope } from './sales-booking.ownership';
import { SalesBookingService } from './sales-booking.service';

// Hold mode on the server (PR #648 review): an old app build or a stale web tab POSTs «احجز» for
// a package that is unpaid with an open payment link: nothing is booked, nobody is told.
const S1 = 'c0000000-0000-4000-8000-000000000001';
const USER: AuthUser = { id: 'a1000000-0000-4000-8000-00000000000a', email: null, role: 'sales' };
const REQ = bookingRequestSchema.parse({
  kind: 'package', package: '8', studentIds: [S1], teacherId: 'd0000000-0000-4000-8000-000000000001',
  byday: [0, 4], startTimeLocal: '17:00', tz: 'Asia/Riyadh', durationMin: 45, startsOn: '2026-11-08',
});
const OPTS = { invoiceWaived: true, endsOn: '2026-12-03', course: { package: '8', subscriptionId: 'sub1' } };

function setup(held: boolean) {
  const scope = { of: vi.fn(async () => null) };
  const booking = { book: vi.fn(async () => ({ rule_id: 'r1' })) };
  const course = {
    isReplay: vi.fn(async () => false),
    options: vi.fn(async () => OPTS),
    held: vi.fn(async () => held),
  };
  const service = new SalesBookingService(
    scope as unknown as SalesBookingScope,
    booking as unknown as BookingService,
    course as unknown as SalesCourse,
  );
  return { service, booking, course };
}

const salesMoney: AuthUser = { ...USER, permissions: ['self.sales', 'self.sales_money'] };

describe('SalesBookingService.book — a held package', () => {
  it('409 course_held with its text; nothing booked, nobody told', async () => {
    const t = setup(true);
    const e: unknown = await t.service.book(REQ, salesMoney).catch((err: unknown) => err);
    expect(e).toBeInstanceOf(HttpException);
    const res = e instanceof HttpException ? e.getResponse() : null;
    expect(res).toMatchObject({ code: 'course_held', message: expect.stringContaining('بانتظار الدفع') });
    expect(t.course.held).toHaveBeenCalledWith('sub1');
    expect(t.booking.book).not.toHaveBeenCalled();
  });

  it('not held (paid, or no open link): booked as before', async () => {
    const t = setup(false);
    expect(await t.service.book(REQ, salesMoney)).toEqual({ rule_id: 'r1' });
    expect(t.booking.book).toHaveBeenCalledWith(REQ, USER.id, OPTS);
  });
});
