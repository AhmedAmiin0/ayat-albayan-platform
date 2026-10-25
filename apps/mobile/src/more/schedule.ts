import { CAIRO_TZ, intlLocale, RIYADH_TZ } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { ltr } from '@/core/ui/primitives/Ltr';
import type { AvailabilityRow, TimeOff } from './types';

// Read-only teacher schedule helpers (R-TCH-02). Pure, so they are unit-tested.

export interface WeekdaySlots {
  weekday: number;
  slots: AvailabilityRow[];
}

/** Days that have slots, الأحد → السبت, each day's slots by start time. */
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

/** «الأحد» … «السبت» (ar.json enums.weekday, keys "0"–"6" in order). */
export function weekdayName(weekday: number): string {
  return Object.values(t.enums.weekday)[weekday] ?? '';
}

/** The zone the weekly times are in: the grid's own (saved with it), else the teacher's. */
export function gridTz(rows: readonly AvailabilityRow[], teacherTz: string): string {
  return rows[0]?.tz ?? teacherTz;
}

/** «الرياض» / «القاهرة» for the academy's two zones; any other IANA id as an isolated LTR island. */
export function tzLabel(tz: string): string {
  if (tz === RIYADH_TZ) return t.runningHead.riyadh;
  if (tz === CAIRO_TZ) return t.runningHead.cairo;
  return ltr(tz);
}

/** «16:00 – 18:00»; render it inside <Ltr>. */
export function slotRange(slot: Pick<AvailabilityRow, 'start_time' | 'end_time'>): string {
  return `${slot.start_time} – ${slot.end_time}`;
}

/** Time-off not over yet (ends after `now`), soonest first. */
export function upcomingTimeOff(list: readonly TimeOff[], now: Date): TimeOff[] {
  return list
    .filter((off) => Date.parse(off.ends_at) > now.getTime())
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
}

// The UI language, Western digits (docs/07 §2: `nu-latn`). No formatRange: Hermes' Intl lacks it.
const day = new Intl.DateTimeFormat(intlLocale(locale), {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const dayTime = new Intl.DateTimeFormat(intlLocale(locale), {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const atMidnight = (d: Date) => d.getHours() === 0 && d.getMinutes() === 0;

/**
 * UTC instants → the span in the device's zone (like the web). Whole days read as days with the
 * end exclusive (10th 00:00 → 13th 00:00 = 10 – 12); one whole day is just that day.
 */
export function formatTimeOff(off: Pick<TimeOff, 'starts_at' | 'ends_at'>): string {
  const start = new Date(off.starts_at);
  const end = new Date(off.ends_at);
  if (atMidnight(start) && atMidnight(end)) {
    const first = day.format(start);
    const last = day.format(new Date(end.getTime() - 60_000));
    return first === last ? first : `${first} – ${last}`;
  }
  return `${dayTime.format(start)} – ${dayTime.format(end)}`;
}
