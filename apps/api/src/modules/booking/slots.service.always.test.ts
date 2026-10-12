import { RIYADH_TZ } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { fakeSettings } from '../../common/settings/settings.fakes';
import { allDayRows } from '../teachers/availability/free-slots';
import type { SlotsQuery } from './booking.dto';
import { fakeContext, IDS } from './booking.fakes';
import type { BookingQueries } from './booking.queries';
import { ALWAYS_STEP_MIN, SlotsService } from './slots.service';

// settings.teachers_always_available on: AvailabilityQueries.bookableSlots answers every day
// 00:00–24:00 Riyadh. Sun 2026-10-04 in Riyadh (UTC+3) is 2026-10-03T21:00Z → 2026-10-04T21:00Z.
const query = (over: Partial<SlotsQuery> = {}): SlotsQuery => ({
  teacherId: IDS.teacher,
  from: '2026-10-03T21:00:00Z',
  to: '2026-10-04T21:00:00Z',
  durationMin: 45,
  ...over,
});
function setup() {
  const deps = fakeContext();
  deps.availability.bookableSlots.mockResolvedValue(allDayRows(RIYADH_TZ));
  const settings = fakeSettings({ teachers_always_available: true });
  return { ...deps, service: new SlotsService(deps.queries as unknown as BookingQueries, deps.context, settings) };
}
const byStart = (slots: { starts_at: string; conflicts: { kind: string }[] }[]) =>
  Object.fromEntries(slots.map((s) => [s.starts_at, s.conflicts.map((c) => c.kind)]));

describe('SlotsService with teachers available 24/7 (owner 2026-10-12)', () => {
  it('steps by 30 min from midnight Riyadh, so 03:00 is free and 16:00 is offered for a 45-min lesson', async () => {
    const res = await setup().service.slots(query());
    expect(res.step_min).toBe(ALWAYS_STEP_MIN);
    // 00:00 … 23:00 Riyadh: the last 45-min start that ends by midnight.
    expect(res.slots).toHaveLength(47);
    expect(res.slots[0]?.starts_at).toBe('2026-10-03T21:00:00.000Z');
    expect(res.slots.at(-1)?.starts_at).toBe('2026-10-04T20:00:00.000Z');
    const kinds = byStart(res.slots);
    expect(kinds['2026-10-04T00:00:00.000Z']).toEqual([]); // 03:00 Riyadh
    expect(kinds['2026-10-04T13:00:00.000Z']).toEqual([]); // 16:00 Riyadh
    expect(res.slots.every((s) => s.conflicts.length === 0)).toBe(true);
  });

  it('a booked lesson and time off still block the starts they touch', async () => {
    const { service, availability } = setup();
    availability.listBusyLessons.mockResolvedValue([
      { id: 'T1', starts_at: new Date('2026-10-04T13:00:00Z'), ends_at: new Date('2026-10-04T13:45:00Z') },
    ]);
    availability.listTimeOff.mockResolvedValue([{ starts_at: '2026-10-04T00:00:00Z', ends_at: '2026-10-04T01:00:00Z' }]);
    const kinds = byStart((await service.slots(query())).slots);
    expect(kinds['2026-10-04T12:30:00.000Z']).toEqual(['teacher_busy']); // 15:30 runs into it
    expect(kinds['2026-10-04T13:00:00.000Z']).toEqual(['teacher_busy']);
    expect(kinds['2026-10-04T13:30:00.000Z']).toEqual(['teacher_busy']);
    expect(kinds['2026-10-04T14:00:00.000Z']).toEqual([]);
    expect(kinds['2026-10-04T00:00:00.000Z']).toEqual(['time_off']);
    expect(Object.values(kinds).flat()).not.toContain('outside_availability');
  });

  it('an explicit stepMin still wins (edit time asks for 15)', async () => {
    const res = await setup().service.slots(query({ stepMin: 15 }));
    expect(res.step_min).toBe(15);
    expect(res.slots[1]?.starts_at).toBe('2026-10-03T21:15:00.000Z');
  });
});
