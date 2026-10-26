import { DEFAULT_DURATION, SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { AvailabilityQuery, FreeSlotsQuery } from '../../people/teachers/availability/availability.query';
import { FollowUpSlots, type SlotWindow } from './follow-up-slots';
import type { FollowUpsQueries } from './follow-ups.queries';

/** The registry defaults (12 h → 7 days), what the follow_up_slots rule says with no row. */
const DEFAULT_WINDOW: SlotWindow = {
  slots_from_hours: SETTING_DEFAULTS.follow_up_slots_from_hours,
  slots_to_days: SETTING_DEFAULTS.follow_up_slots_to_days,
};

const byTeacher: Record<string, string[]> = {
  't-1': ['2026-10-04T14:00:00Z'],
  't-2': ['2026-10-03T16:00:00Z', '2026-10-04T14:00:00Z'],
};

function setup() {
  const queries = { activeTeacherIds: async () => ['t-1', 't-2'] };
  const freeSlots = vi.fn(async (q: FreeSlotsQuery) =>
    (byTeacher[q.teacherId] ?? []).map((s) => ({ start: new Date(s), end: new Date(Date.parse(s) + 45 * 60_000) })),
  );
  const slots = new FollowUpSlots(
    queries as unknown as FollowUpsQueries,
    { freeSlots } as unknown as AvailabilityQuery,
  );
  return { slots, freeSlots };
}

describe('FollowUpSlots.freeStarts (R-LEAD-05: real teacher availability)', () => {
  it('asks every active teacher for lesson-length free slots 12 h → 7 days ahead', async () => {
    const { slots, freeSlots } = setup();
    const starts = await slots.freeStarts(new Date('2026-10-02T10:00:00Z'), DEFAULT_WINDOW);
    expect(freeSlots).toHaveBeenCalledWith({
      teacherId: 't-1',
      from: new Date('2026-10-02T22:00:00Z'),
      to: new Date('2026-10-09T10:00:00Z'),
      durationMin: DEFAULT_DURATION,
    });
    expect(starts.map((s) => s.toISOString())).toEqual([
      '2026-10-04T14:00:00.000Z',
      '2026-10-03T16:00:00.000Z',
      '2026-10-04T14:00:00.000Z',
    ]);
  });

  it('follows the window it is given (slots_from_hours / slots_to_days)', async () => {
    const { slots, freeSlots } = setup();
    await slots.freeStarts(new Date('2026-10-02T10:00:00Z'), { slots_from_hours: 24, slots_to_days: 3 });
    expect(freeSlots).toHaveBeenCalledWith(
      expect.objectContaining({ from: new Date('2026-10-03T10:00:00Z'), to: new Date('2026-10-05T10:00:00Z') }),
    );
  });

  it('a window that ends before it starts offers nothing', async () => {
    const { slots, freeSlots } = setup();
    expect(await slots.freeStarts(new Date('2026-10-02T10:00:00Z'), { slots_from_hours: 72, slots_to_days: 1 })).toEqual([]);
    expect(freeSlots).not.toHaveBeenCalled();
  });
});
