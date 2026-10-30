import { viewerTz } from '@ab/client-core';
import {
  clockTime,
  lessonWhenText,
  otherZoneClock,
  sameClockAt,
  utcOffsetMinutes,
  type ClockCycle,
  type SlotView,
} from '@ab/shared';
import { clockIn, whenIn } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { ltr } from '@/core/ui/primitives/Ltr';
import { localDate } from '@/today/lib/timeline';

// Free trial slots (R-SCH-06, R-SCH-01): the next 7 days of GET /booking/slots, laid out by the
// viewer's day, the viewer's time first and the student's own clock beside it when it differs
// (docs/34). Picked, never typed (rule 6): a slot is an instant, sent as is. Text helpers read the
// viewer's zone from the store (viewerTz), set before any screen opens.

const DAY = 86_400_000;
const WINDOW_DAYS = 7;
const cities: Record<string, string | undefined> = t.tz;

export const cityOf = (tz: string): string => cities[tz] ?? ltr(tz);

/** GET /booking/slots `from`/`to`: now → 7 days on (the API caps a window at 14). */
export function slotWindow(now: Date): { from: string; to: string } {
  return { from: now.toISOString(), to: new Date(now.getTime() + WINDOW_DAYS * DAY).toISOString() };
}

/** The instant a local day (YYYY-MM-DD) begins in `tz`; a second pass settles a DST change. */
export function dayStartUtc(date: string, tz: string): Date {
  const wall = Date.parse(`${date}T00:00:00Z`);
  const first = wall - utcOffsetMinutes(tz, new Date(wall)) * 60_000;
  return new Date(wall - utcOffsetMinutes(tz, new Date(first)) * 60_000);
}

/** Where the slot window opens: now, or `from` (an instant) when that is later. */
export function windowStart(now: Date, from?: string): Date {
  const at = from ? Date.parse(from) : NaN;
  return Number.isNaN(at) || at <= now.getTime() ? now : new Date(at);
}

/** The rule fields a slot fixes in the family's zone: local day, «HH:MM», weekday 0 = الأحد. */
export function ruleFromSlot(
  startsAt: string,
  tz: string,
): { startsOn: string; startTimeLocal: string; weekday: number } {
  const at = new Date(startsAt);
  const startsOn = localDate(at, tz);
  return {
    startsOn,
    startTimeLocal: clockTime(at, tz),
    weekday: new Date(`${startsOn}T00:00:00Z`).getUTCDay(),
  };
}

interface SlotDay {
  /** The viewer's local date, YYYY-MM-DD. */
  date: string;
  /** «الأحد 4 أكتوبر». */
  label: string;
  slots: SlotView[];
}

/** «الأحد 4 أكتوبر» of an instant on the viewer's calendar (lessonWhenText without its clock). */
export function dayLabel(at: Date): string {
  return lessonWhenText(at, viewerTz(), locale).replace(/\s\d{2}:\d{2}$/, '');
}

/** Only the slots with no clash, grouped by the viewer's day, earliest first. */
export function freeSlotDays(slots: readonly SlotView[]): SlotDay[] {
  const days = new Map<string, SlotDay>();
  const free = slots
    .filter((s) => s.conflicts.length === 0)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  for (const slot of free) {
    const at = new Date(slot.starts_at);
    const date = localDate(at, viewerTz());
    const day = days.get(date) ?? { date, label: dayLabel(at), slots: [] };
    day.slots.push(slot);
    days.set(date, day);
  }
  return [...days.values()];
}

/** A slot's big clock (the viewer's), and the student's `tz` clock under it when it differs. */
export function slotTimes(
  startsAt: string,
  tz: string,
  cycle: ClockCycle,
): { main: string; local: string | null } {
  const at = new Date(startsAt);
  const viewer = viewerTz();
  const other = otherZoneClock(at, tz, { tz: viewer, cycle, locale });
  const local = other && t.today.studentTime.replace('{time}', other).replace('{city}', cityOf(tz));
  return { main: clockIn(at, viewer, cycle), local };
}

/** «الأحد 4 أكتوبر 17:00 بتوقيتك، عند الطالب الأحد 4 أكتوبر 18:00 بتوقيت الرياض». */
export function whenText(startsAt: string, tz: string, cycle: ClockCycle): string {
  const at = new Date(startsAt);
  const viewer = viewerTz();
  const own = `${whenIn(at, viewer, cycle)} ${t.schedule.viewerTime}`;
  if (sameClockAt(at, { a: tz, b: viewer })) return own;
  const local = t.schedule.inCity
    .replace('{time}', whenIn(at, tz, cycle))
    .replace('{city}', cityOf(tz));
  return `${own}${t.common.listSeparator}${t.booking.studentLocal.replace('{time}', local)}`;
}
