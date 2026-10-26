import { describe, expect, it } from 'vitest';
import { allDayRows, freeSlots } from './free-slots';

const MIN = 60_000;
const gaps = (starts: Date[]) => starts.slice(1).map((s, i) => (s.getTime() - (starts[i]?.getTime() ?? 0)) / MIN);

describe('allDayRows (settings.teachers_always_available)', () => {
  it('is every weekday 00:00–24:00 in the given zone', () => {
    expect(allDayRows('Asia/Riyadh')).toEqual(
      [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, start_time: '00:00', end_time: '24:00', tz: 'Asia/Riyadh' })),
    );
  });

  it('Riyadh, two days, 45-min lessons on a 30-min step: one grid on :00/:30 across midnight', () => {
    const slots = freeSlots({
      from: new Date('2026-10-03T21:00:00Z'), // Sun 2026-10-04 00:00 Riyadh
      to: new Date('2026-10-05T21:00:00Z'), // Tue 00:00 Riyadh
      durationMin: 45,
      stepMin: 30,
      availability: allDayRows('Asia/Riyadh'),
      timeOff: [],
      busy: [],
    });
    expect(slots).toHaveLength(95); // 00:00 Sun … 23:00 Mon
    expect(new Set(gaps(slots.map((s) => s.start)))).toEqual(new Set([30]));
    expect(slots.every((s) => s.start.getUTCMinutes() % 30 === 0)).toBe(true);
    // Sun 23:30 → Mon 00:15 crosses midnight: the two days are one window.
    expect(slots.map((s) => s.start.toISOString())).toContain('2026-10-04T20:30:00.000Z');
  });

  it('Cairo across the 2026-10-29 fall-back: hourly starts with no gap', () => {
    const slots = freeSlots({
      from: new Date('2026-10-29T00:00:00Z'),
      to: new Date('2026-10-31T00:00:00Z'),
      durationMin: 60,
      availability: allDayRows('Africa/Cairo'),
      timeOff: [],
      busy: [],
    });
    expect(slots).toHaveLength(48);
    expect(new Set(gaps(slots.map((s) => s.start)))).toEqual(new Set([60]));
  });

  it('time off and busy lessons still cut the day', () => {
    const slots = freeSlots({
      from: new Date('2026-10-03T21:00:00Z'),
      to: new Date('2026-10-04T21:00:00Z'),
      durationMin: 60,
      availability: allDayRows('Asia/Riyadh'),
      timeOff: [{ start: new Date('2026-10-03T21:00:00Z'), end: new Date('2026-10-04T09:00:00Z') }],
      busy: [{ start: new Date('2026-10-04T13:00:00Z'), end: new Date('2026-10-04T14:00:00Z') }],
    });
    const starts = slots.map((s) => s.start.toISOString().slice(11, 16));
    expect(starts).toEqual(['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']);
  });
});
