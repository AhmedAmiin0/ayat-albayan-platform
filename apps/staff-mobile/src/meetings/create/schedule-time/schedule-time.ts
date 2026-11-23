import {
  DEFAULT_MEETING_DURATION,
  localDateIn,
  MEETING_DURATION_MAX,
  MEETING_DURATION_MIN,
  wallToUtc,
  zonedFieldsIn,
} from '@ab/shared';
import { addDays } from '@/calendar/lib/week';

// The schedule form's wall clock (rule 6): a local day, an hour and a minute in the viewer's zone,
// turned into a UTC instant for the API through the date-fns facade (docs/34 §7). No date-picker.

const MIN = 60_000;
const QUARTER = 15;

export interface Slot {
  /** Local calendar day in the viewer's zone, YYYY-MM-DD. */
  date: string;
  hour: number;
  minute: number;
  durationMin: number;
}

/** Local day, hour and minute of `instant` in `tz`. */
export function zonedClock(instant: Date, tz: string): Pick<Slot, 'date' | 'hour' | 'minute'> {
  const { hour, minute } = zonedFieldsIn(instant, tz);
  return { date: localDateIn(instant, tz), hour, minute };
}

/** The UTC instant (ISO) of a wall clock in `tz` (wallToUtc: two offset reads, as before). */
export function startsAtUtc(slot: Pick<Slot, 'date' | 'hour' | 'minute'>, tz: string): string {
  return wallToUtc(slot.date, slot.hour * 60 + slot.minute, tz).toISOString();
}

/** A fresh form: the next quarter hour at least 15 minutes from now, one hour long. */
export function defaultSlot(now: Date, tz: string): Slot {
  const step = QUARTER * MIN;
  const next = new Date(Math.ceil((now.getTime() + step) / step) * step);
  return { ...zonedClock(next, tz), durationMin: DEFAULT_MEETING_DURATION };
}

/** A meeting's current time as a form (reschedule); its length from planned_end_at, else the default. */
export function slotOf(startsAt: string, plannedEnd: string | null, tz: string): Slot {
  const length = plannedEnd ? Math.round((Date.parse(plannedEnd) - Date.parse(startsAt)) / MIN) : DEFAULT_MEETING_DURATION;
  const durationMin = Math.min(MEETING_DURATION_MAX, Math.max(MEETING_DURATION_MIN, length));
  return { ...zonedClock(new Date(startsAt), tz), durationMin };
}

/** The 14 day chips: today and the next 13 days on the viewer's calendar. */
export function dateChoices(now: Date, tz: string, count = 14): string[] {
  const today = zonedClock(now, tz).date;
  return Array.from({ length: count }, (_, i) => addDays(today, i));
}
