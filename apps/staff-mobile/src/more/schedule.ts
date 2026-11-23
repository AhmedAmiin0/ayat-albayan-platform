import { CAIRO_TZ, dateText, RIYADH_TZ, zonedFieldsIn, type ClockCycle } from '@ab/shared';
import { clockIn, hhmm, phoneTz, rangeOf } from '@/core/lib/clock';
import { t, locale, ltr } from '@ab/mobile-kit';
import type { AvailabilityRow, TimeOff } from '@ab/shared';

// Read-only teacher schedule helpers (R-TCH-02). Pure, so they are unit-tested.

export interface WeekdaySlots {
  weekday: number;
  slots: AvailabilityRow[];
}

/** Only days with slots, Sunday to Saturday, each sorted by start. */
export function groupByWeekday(rows: readonly AvailabilityRow[]): WeekdaySlots[] {
  const days: WeekdaySlots[] = [];
  for (let weekday = 0; weekday <= 6; weekday++) {
    const slots = rows
      .filter((r) => r.weekday === weekday)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    if (slots.length) days.push({ weekday, slots });
  }
  return days;
}

/** Relies on ar.json enums.weekday keys 0 to 6 in order. */
export function weekdayName(weekday: number): string {
  return Object.values(t.enums.weekday)[weekday] ?? '';
}

/** The zone the weekly times are in: the grid's own (saved with it), else the teacher's. */
export function gridTz(rows: readonly AvailabilityRow[], teacherTz: string): string {
  return rows[0]?.tz ?? teacherTz;
}

/** Any IANA id other than the academy's two zones shows as an isolated LTR island. */
export function tzLabel(tz: string): string {
  if (tz === RIYADH_TZ) return t.runningHead.riyadh;
  if (tz === CAIRO_TZ) return t.runningHead.cairo;
  return ltr(tz);
}

/** Already isolated, so render as plain text. */
export function slotRange(slot: Pick<AvailabilityRow, 'start_time' | 'end_time'>, cycle: ClockCycle): string {
  return rangeOf(hhmm(slot.start_time, cycle), hhmm(slot.end_time, cycle), cycle);
}

/** Time-off not over yet (ends after `now`), soonest first. */
export function upcomingTimeOff(list: readonly TimeOff[], now: Date): TimeOff[] {
  return list
    .filter((off) => Date.parse(off.ends_at) > now.getTime())
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
}

// The UI language, Western digits (docs/07 §2: `nu-latn`). No formatRange: Hermes' Intl lacks it.
const DAY = { weekday: 'long', day: 'numeric', month: 'long' } as const;
const atMidnight = (d: Date, tz: string) => {
  const { hour, minute } = zonedFieldsIn(d, tz);
  return hour === 0 && minute === 0;
};

/**
 * UTC instants → the span in the device's zone (like the web). Whole days read as days with the
 * end exclusive (10th 00:00 → 13th 00:00 = 10 – 12); one whole day is just that day.
 */
export function formatTimeOff(off: Pick<TimeOff, 'starts_at' | 'ends_at'>, cycle: ClockCycle): string {
  const start = new Date(off.starts_at);
  const end = new Date(off.ends_at);
  const tz = phoneTz();
  const day = (d: Date) => dateText(d, { tz, locale }, DAY);
  if (atMidnight(start, tz) && atMidnight(end, tz)) {
    const first = day(start);
    const last = day(new Date(end.getTime() - 60_000));
    return first === last ? first : `${first} – ${last}`;
  }
  const dayTime = (d: Date) => `${day(d)} ${clockIn(d, tz, cycle)}`;
  return `${dayTime(start)} – ${dayTime(end)}`;
}
