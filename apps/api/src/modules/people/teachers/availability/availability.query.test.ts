import { describe, expect, it, vi } from 'vitest';
import type { AvailabilityRepo } from './availability.repo';
import { AvailabilityQuery } from './availability.query';

const TEACHER = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';

function setup() {
  const queries = {
    listSlots: vi.fn().mockResolvedValue([
      { id: 'r1', weekday: 3, start_time: '16:00', end_time: '19:00', tz: 'Africa/Cairo' },
    ]),
    listTimeOff: vi.fn().mockResolvedValue([
      { starts_at: '2026-07-15T14:00:00+00:00', ends_at: '2026-07-15T15:00:00+00:00' },
    ]),
    listBusyLessons: vi.fn().mockResolvedValue([
      {
        id: 'L1',
        starts_at: new Date('2026-07-15T13:00:00Z'),
        ends_at: new Date('2026-07-15T14:00:00Z'),
      },
    ]),
  };
  return { queries, query: new AvailabilityQuery(queries as unknown as AvailabilityRepo) };
}

describe('AvailabilityQuery.freeSlots (R-TCH-02, R-SCH-04)', () => {
  const from = new Date('2026-07-15T00:00:00Z');
  const to = new Date('2026-07-16T00:00:00Z');

  it('combines the stored grid, stored time-off and the teacher’s booked lessons', async () => {
    const { query } = setup();
    // Wed 16:00–19:00 Cairo (UTC+3) = 13:00–16:00Z; lesson 13–14Z, time-off 14–15Z → 15:00Z only.
    const slots = await query.freeSlots({ teacherId: TEACHER, from, to, durationMin: 60 });
    expect(slots.map((s) => s.start.toISOString())).toEqual(['2026-07-15T15:00:00.000Z']);
  });

  it('a free day stays free: no lessons → the whole window', async () => {
    const { query, queries } = setup();
    queries.listTimeOff.mockResolvedValue([]);
    queries.listBusyLessons.mockResolvedValue([]);
    const slots = await query.freeSlots({ teacherId: TEACHER, from, to, durationMin: 60 });
    expect(slots).toHaveLength(3);
  });

  it('loads time-off and lessons with a 2-day margin around the range', async () => {
    const { query, queries } = setup();
    await query.freeSlots({ teacherId: TEACHER, from, to, durationMin: 60 });
    const margin = { from: new Date('2026-07-13T00:00:00Z'), to: new Date('2026-07-18T00:00:00Z') };
    expect(queries.listSlots).toHaveBeenCalledWith(TEACHER);
    expect(queries.listTimeOff).toHaveBeenCalledWith(TEACHER, margin);
    expect(queries.listBusyLessons).toHaveBeenCalledWith(TEACHER, margin);
  });
});
