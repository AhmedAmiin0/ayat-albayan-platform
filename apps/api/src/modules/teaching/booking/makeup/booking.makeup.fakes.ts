// Test-only fakes for a makeup booking (R-SCH-10).
import type { BookingRequest } from '@ab/shared';
import { bookingRequest, IDS } from '@/modules/teaching/booking/booking.fakes';
import type { MakeupOriginalRow } from '@/modules/teaching/booking/core/booking.repo';

/** Sun 2026-09-27 (4 days before NOW): S1's no-show the package charged; S2 was not on it. */
export function missedLessonRow(over: Partial<MakeupOriginalRow> = {}): MakeupOriginalRow {
  return {
    id: IDS.missed,
    status: 'no_show',
    starts_at: '2026-09-27T14:00:00Z',
    makeup_of_id: null,
    rule: { package: '8' },
    lesson_students: [{ student_id: IDS.s1, chargeable: true }],
    ...over,
  };
}

/** A makeup for S1 with no package, replacing IDS.missed, on the Sunday after NOW. */
export function makeupRequest(over: Record<string, unknown> = {}): BookingRequest {
  return bookingRequest({
    kind: 'makeup',
    package: undefined,
    studentIds: [IDS.s1],
    makeupOfLessonId: IDS.missed,
    ...over,
  });
}
