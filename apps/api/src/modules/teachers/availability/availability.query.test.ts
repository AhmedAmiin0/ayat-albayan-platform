import { describe, expect, it, vi } from 'vitest';
import type { AvailabilityQueries } from './availability.queries';
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
  };
  return { queries, query: new AvailabilityQuery(queries as unknown as AvailabilityQueries) };
}

describe('AvailabilityQuery.freeSlots (R-TCH-02)', () => {
  const from = new Date('2026-07-15T00:00:00Z');
  const to = new Date('2026-07-16T00:00:00Z');

  it('combines the stored grid, stored time-off and given busy lessons', async () => {
    const { query } = setup();
    const busy = [{ start: new Date('2026-07-15T13:00:00Z'), end: new Date('2026-07-15T14:00:00Z') }];
    const slots = await query.freeSlots({ teacherId: TEACHER, from, to, durationMin: 60, busy });
    expect(slots.map((s) => s.start.toISOString())).toEqual(['2026-07-15T15:00:00.000Z']);
  });

  it('loads time-off with a 2-day margin around the range', async () => {
    const { query, queries } = setup();
    await query.freeSlots({ teacherId: TEACHER, from, to, durationMin: 60 });
    expect(queries.listSlots).toHaveBeenCalledWith(TEACHER);
    expect(queries.listTimeOff).toHaveBeenCalledWith(TEACHER, {
      from: new Date('2026-07-13T00:00:00Z'),
      to: new Date('2026-07-18T00:00:00Z'),
    });
  });
});
