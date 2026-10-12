import { DEFAULT_MEETING_DURATION, MEETING_DURATION_MAX, MEETING_DURATION_MIN, utcOffsetMinutes } from '@ab/shared';
import { addDays } from '@/calendar/week';

// The schedule form's wall clock (rule 6): a local day, an hour and a minute in the viewer's zone,
// turned into a UTC instant for the API. No date-picker and no tz library: Intl offsets only.

const MIN = 60_000;
const QUARTER = 15;

export interface Slot {
  /** Local calendar day in the viewer's zone, YYYY-MM-DD. */
  date: string;
  hour: number;
  minute: number;
  durationMin: number;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** Local day, hour and minute of `instant` in `tz`. */
export function zonedClock(instant: Date, tz: string): Pick<Slot, 'date' | 'hour' | 'minute'> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) % 24, minute: Number(get('minute')) };
}

/** The UTC instant (ISO) of a wall clock in `tz`; a second pass settles a DST change in between. */
export function startsAtUtc(slot: Pick<Slot, 'date' | 'hour' | 'minute'>, tz: string): string {
  const wall = Date.parse(`${slot.date}T${pad(slot.hour)}:${pad(slot.minute)}:00Z`);
  const first = wall - utcOffsetMinutes(tz, new Date(wall)) * MIN;
  return new Date(wall - utcOffsetMinutes(tz, new Date(first)) * MIN).toISOString();
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
