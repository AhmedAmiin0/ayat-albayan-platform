import { bookingRequestSchema } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { ABRAR } from '@/features/teaching/booking/wizard-fixture';
import { courseEnd, pickedRule, withPicks } from './draft.days';
import { emptyDraft, toBookingRequest, type BookingDraft } from './draft';

// New York springs forward on Sunday 14 March 2027: 02:30 does not exist that day, so the prefilled
// Sunday lands at 03:30 EDT while the course's own time stays 02:30.
const SUN_GAP = '2027-03-14T07:30:00.000Z';
const WED = '2027-03-17T06:30:00.000Z'; // Wednesday 02:30 EDT
const PREFILLED = [
  { at: SUN_GAP, weekday: 0, startTimeLocal: '02:30' },
  { at: WED, weekday: 3, startTimeLocal: '02:30' },
];

function draft(picks: string[], prefilled?: typeof PREFILLED): BookingDraft {
  const course = { perWeek: 2, lessonsTotal: 8, package: '8' as const, startsOn: '2027-03-13', ...(prefilled ? { prefilled } : {}) };
  return {
    ...emptyDraft({ kind: 'package' }),
    students: [{ id: '0b5e7d1a-2c3d-4e5f-9a8b-7c6d5e4f3a2b', name: 'سهيلة', code: 'AB-0183' }],
    tz: 'America/New_York',
    teacher: ABRAR,
    course,
    ...withPicks(picks),
  };
}

describe('«تابِع بنفس الأيام»: the body keeps each prefilled day’s own time (DST-safe)', () => {
  it('a pick still equal to a prefilled one keeps its day’s time, not the shifted wall clock', () => {
    const body = toBookingRequest(draft([SUN_GAP, WED], PREFILLED));
    expect(body).toMatchObject({ byday: [0, 3], startTimeLocal: '02:30', startsOn: '2027-03-14', startsAt: SUN_GAP });
    expect(body).not.toHaveProperty('dayTimes');
    expect(bookingRequestSchema.safeParse(body).success).toBe(true);
  });

  it('without prefilled picks the wall clock is read as before', () => {
    expect(pickedRule(draft([SUN_GAP, WED]))).toMatchObject({
      startTimeLocal: '03:30',
      dayTimes: [{ weekday: 3, startTimeLocal: '02:30' }],
    });
  });

  it('a day she moved reads its own wall time; the course end follows the same rule', () => {
    const moved = '2027-03-15T13:00:00.000Z'; // Monday 09:00 EDT
    expect(pickedRule(draft([moved, WED], PREFILLED))).toMatchObject({
      byday: [1, 3],
      startTimeLocal: '09:00',
      dayTimes: [{ weekday: 3, startTimeLocal: '02:30' }],
    });
    expect(courseEnd(draft([SUN_GAP, WED], PREFILLED))).toBe('2027-04-07');
  });
});
