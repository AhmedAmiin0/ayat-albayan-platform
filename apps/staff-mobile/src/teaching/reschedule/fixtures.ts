import type { Conflict, SlotView, SlotsResponse } from '@ab/shared';

// GET /booking/slots rows for the reschedule tests. «Now» is Thursday 1 Oct 2026 16:20 Riyadh.

export const NOW = new Date('2026-10-01T13:20:00Z');

const slot = (startsAt: string, conflicts: Conflict[] = []): SlotView => ({
  starts_at: startsAt,
  ends_at: new Date(Date.parse(startsAt) + 45 * 60_000).toISOString(),
  conflicts,
});

/** Saturday 17:00 Riyadh. */
export const SAT_17 = '2026-10-03T14:00:00.000Z';
/** Saturday 18:00 Riyadh. */
export const SAT_18 = '2026-10-03T15:00:00.000Z';
/** Sunday 17:00 Riyadh. */
export const SUN_17 = '2026-10-04T14:00:00.000Z';

export const busy: Conflict = {
  kind: 'student_busy',
  startsAt: '2026-10-03T16:00:00.000Z',
  endsAt: '2026-10-03T16:45:00.000Z',
};

export const SLOTS: SlotsResponse = {
  teacher_tz: 'Africa/Cairo',
  step_min: 45,
  // Saturday 19:00 clashes with a student's lesson: never offered.
  slots: [slot(SAT_17), slot(SAT_18), slot(busy.startsAt, [busy]), slot(SUN_17)],
};
