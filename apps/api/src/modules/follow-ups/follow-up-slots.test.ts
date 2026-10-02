import { DEFAULT_DURATION } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { AvailabilityQuery, FreeSlotsQuery } from '../teachers/availability/availability.query';
import { FollowUpSlots } from './follow-up-slots';
import type { FollowUpsQueries } from './follow-ups.queries';

describe('FollowUpSlots.freeStarts (R-LEAD-05: real teacher availability)', () => {
  it('asks every active teacher for lesson-length free slots 12 h → 7 days ahead', async () => {
    const queries = { activeTeacherIds: async () => ['t-1', 't-2'] };
    const byTeacher: Record<string, string[]> = {
      't-1': ['2026-10-04T14:00:00Z'],
      't-2': ['2026-10-03T16:00:00Z', '2026-10-04T14:00:00Z'],
    };
    const freeSlots = vi.fn(async (q: FreeSlotsQuery) =>
      (byTeacher[q.teacherId] ?? []).map((s) => ({ start: new Date(s), end: new Date(Date.parse(s) + 45 * 60_000) })),
    );
    const slots = new FollowUpSlots(
      queries as unknown as FollowUpsQueries,
      { freeSlots } as unknown as AvailabilityQuery,
    );
    const starts = await slots.freeStarts(new Date('2026-10-02T10:00:00Z'));
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
});
