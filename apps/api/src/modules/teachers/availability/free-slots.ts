import { mergeIntervals, subtractIntervals, type Interval } from './intervals';
import { DAY, localDay, MINUTE, toMinutes, weekdayOf, zonedToUtc } from './zoned-time';

/** One weekly availability row, wall-clock in its own `tz` (teacher_availability). R-TCH-02. */
export type WeeklyRow = { weekday: number; start_time: string; end_time: string; tz: string };
export type TimeRange = { start: Date; end: Date };

export type FreeSlotsInput = {
  from: Date;
  to: Date;
  durationMin: number;
  availability: readonly WeeklyRow[];
  /** One-off unavailability (teacher_time_off), UTC. */
  timeOff: readonly TimeRange[];
  /** Already-booked lessons, UTC (AvailabilityQuery loads the occupying `lessons` rows). */
  busy: readonly TimeRange[];
  /** Distance between candidate starts. TODO(R-SCH-06): confirm the wizard's grid step. */
  stepMin?: number;
};

const toInterval = (r: TimeRange): Interval => ({ start: r.start.getTime(), end: r.end.getTime() });

/** Every occurrence of `row` whose local day is within `range` ±1 day (covers ±14h offsets). */
export function expandRow(row: WeeklyRow, range: Interval): Interval[] {
  const startMin = toMinutes(row.start_time);
  const endMin = toMinutes(row.end_time);
  const firstDay = localDay(range.start, row.tz) - DAY;
  const lastDay = localDay(range.end, row.tz) + DAY;
  const out: Interval[] = [];
  const offset = (row.weekday - weekdayOf(firstDay) + 7) % 7;
  for (let day = firstDay + offset * DAY; day <= lastDay; day += 7 * DAY) {
    out.push({ start: zonedToUtc(day, startMin, row.tz), end: zonedToUtc(day, endMin, row.tz) });
  }
  return out;
}

/**
 * Pure core of AvailabilityQuery.freeSlots (R-TCH-02, R-SCH-04, R-SCH-06).
 * Weekly rows → UTC windows (touching windows merge, so 22:00–24:00 + 00:00–02:00 is one window
 * across midnight) − time-off − busy → `durationMin` slots stepped from each free window's start,
 * kept only if fully inside [from, to]. Output is sorted UTC.
 */
export function freeSlots(input: FreeSlotsInput): TimeRange[] {
  const stepMin = input.stepMin ?? input.durationMin;
  if (input.durationMin <= 0 || stepMin <= 0) throw new RangeError('durationMin/stepMin must be > 0');
  const range = toInterval({ start: input.from, end: input.to });
  const windows = mergeIntervals(input.availability.flatMap((row) => expandRow(row, range)));
  const blocked = [...input.timeOff, ...input.busy].map(toInterval);
  const duration = input.durationMin * MINUTE;
  const slots: TimeRange[] = [];
  for (const free of subtractIntervals(windows, blocked)) {
    for (let t = free.start; t + duration <= free.end; t += stepMin * MINUTE) {
      if (t >= range.start && t + duration <= range.end) {
        slots.push({ start: new Date(t), end: new Date(t + duration) });
      }
    }
  }
  return slots;
}
