import { describe, expect, it } from 'vitest';
import { ABRAR as TEACHER, STUDENT_ID } from '@/features/teaching/booking/wizard-fixture';
import { emptyDraft, isOutside, toBookingRequest, type BookingDraft } from './draft';

const STUDENT = { id: STUDENT_ID, name: 'سهيلة', code: 'AB-0183' };
/** Monday 5 Oct 12:00 Riyadh. */
const NOON = '2026-10-05T09:00:00.000Z';
const trial = (o: Partial<BookingDraft> = {}): BookingDraft => ({
  ...emptyDraft({ trial: true }),
  students: [STUDENT],
  tz: 'Asia/Riyadh',
  teacher: TEACHER,
  startsAt: NOON,
  ...o,
});

describe('«وقت آخر» in the booking body (owner 2026-11-21)', () => {
  it('a trial picked outside the hours sends outsideHours with its server instant', () => {
    expect(toBookingRequest(trial({ outsideHours: true }))).toMatchObject({
      outsideHours: true,
      startsAt: NOON,
      byday: [1],
    });
  });

  it('no flag for a normal pick, a reset one, or a package', () => {
    expect(toBookingRequest(trial())).not.toHaveProperty('outsideHours');
    expect(toBookingRequest(trial({ outsideHours: false }))).not.toHaveProperty('outsideHours');
    expect(isOutside({ kind: 'package', outsideHours: true })).toBe(false);
    expect(isOutside({ kind: 'makeup', outsideHours: true })).toBe(true);
  });
});
