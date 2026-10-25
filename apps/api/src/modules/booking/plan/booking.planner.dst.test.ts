import { HttpException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bookingRequest, fakePlanner, IDS } from '../booking.fakes';

// Booked on Tue 1 Sep 2026: the 5-week horizon ends before Cairo leaves DST (end of Thu 29 Oct).
// Riyadh family, Cairo teacher (issue B3): 18:00 Riyadh is 15:00Z all year; 17:00 Cairo is 14:00Z
// until then and 15:00Z after.
const SEP_1 = new Date('2026-09-01T08:00:00Z');
type Body = { conflicts: { kind: string; startsAt: string; lessonId?: string }[] };
const conflictsOf = async (p: Promise<unknown>) => {
  const err = await p.catch((e: unknown) => e);
  if (!(err instanceof HttpException)) throw new Error('expected a 409');
  return (err.getResponse() as Body).conflicts;
};
const at = (start: string, end: string) => ({ starts_at: new Date(start), ends_at: new Date(end) });

describe('BookingPlanner — clashes that only start after a DST change (R-SCH-04, issue B3)', () => {
  beforeEach(() => vi.useFakeTimers({ now: SEP_1, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it("the teacher's Cairo-time rule lands on the new lesson from 1 Nov: 409 at booking time", async () => {
    const { planner, projection } = fakePlanner();
    projection.busy.mockResolvedValue({
      teacher: [{ id: 'rule-cairo', ...at('2026-11-01T15:00:00Z', '2026-11-01T15:45:00Z') }],
      students: [],
    });
    const req = bookingRequest({ startTimeLocal: '18:00', startsOn: '2026-09-01' });
    const conflicts = await conflictsOf(planner.prepare(req));
    expect(conflicts).toContainEqual(
      expect.objectContaining({ kind: 'teacher_busy', startsAt: '2026-11-01T15:00:00.000Z', lessonId: 'rule-cairo' }),
    );
  });

  it("a Riyadh 17:00 lesson leaves a Cairo 17:00–21:00 grid once Cairo falls back", async () => {
    const { planner, availability } = fakePlanner();
    availability.bookableSlots.mockResolvedValue([
      { weekday: 0, start_time: '17:00', end_time: '21:00', tz: 'Africa/Cairo' },
    ]);
    const req = bookingRequest({ startTimeLocal: '17:00', startsOn: '2026-09-01' });
    const conflicts = await conflictsOf(planner.prepare(req));
    expect(conflicts.map((c) => [c.kind, c.startsAt])).toContainEqual([
      'outside_availability',
      '2026-11-01T14:00:00.000Z',
    ]);
    expect(conflicts.every((c) => c.startsAt >= '2026-11-01')).toBe(true);
  });

  it('a trial is one lesson: nothing beyond it is probed', async () => {
    const { planner, busy } = fakePlanner();
    const req = bookingRequest({ package: 'trial', startsOn: '2026-10-01', studentIds: [IDS.s1] });
    await planner.prepare(req).catch(() => undefined);
    const [, span] = busy.teacherLessons.mock.calls[0] ?? [];
    expect(span).toEqual({ from: new Date('2026-10-04T14:00:00Z'), to: new Date('2026-10-04T14:45:00Z') });
  });
});
