import { describe, expect, it } from 'vitest';
import { bookingRoutes, salesBookingRoutes } from './booking.routes';

const TEACHER = '11111111-1111-4111-8111-111111111111';
const STUDENT = '22222222-2222-4222-8222-222222222222';
const lines = (routes: Record<string, { method: string; path: string }>) =>
  Object.values(routes).map((r) => `${r.method} ${r.path}`);

describe('booking routes (R-SCH-06, R-ASST-01)', () => {
  it('keeps the paths the api serves today for the admin', () => {
    expect(lines(bookingRoutes)).toEqual([
      'GET /booking/teachers',
      'GET /booking/slots',
      'GET /booking/outside-slots',
      'POST /booking/check',
      'POST /booking',
    ]);
  });

  it('mirrors them under the sales base for the assistant', () => {
    expect(lines(salesBookingRoutes)).toEqual(
      lines(bookingRoutes).map((l) => l.replace('/booking', '/sales/booking')),
    );
  });

  it('asks the teachers by student or by program, never by neither', () => {
    const { query } = bookingRoutes.teachers;
    expect(query.parse({ studentId: STUDENT })).toEqual({ studentId: STUDENT });
    expect(query.safeParse({ gender: 'female' }).success).toBe(false);
  });

  it('reads the slot grid query from strings, the students as a list', () => {
    const q = { teacherId: TEACHER, durationMin: '45', studentIds: STUDENT };
    const parsed = bookingRoutes.outsideSlots.query.parse(q);
    expect(parsed).toMatchObject({ durationMin: 45, studentIds: [STUDENT] });
    expect(bookingRoutes.slots.query.safeParse(q).success).toBe(false);
  });

  it('answers the check with its clashes and the booking with its series', () => {
    expect(bookingRoutes.check.response.parse({ conflicts: [] })).toEqual({ conflicts: [] });
    expect(salesBookingRoutes.book.response.safeParse({ rule_id: TEACHER }).success).toBe(false);
  });
});
