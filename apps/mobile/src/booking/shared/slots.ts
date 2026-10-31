import {
  clockTime,
  lessonWhenText,
  otherZoneClock,
  sameClockAt,
  wallToUtc,
  weekdayOfDate,
  type SlotView,
} from '@ab/shared';
import { clockIn, whenIn, type ViewerClock } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { ltr } from '@/core/ui/primitives/Ltr';
import { localDate } from '@/today/lib/timeline';

// Free trial slots (R-SCH-06, R-SCH-01): the next 7 days of GET /booking/slots, laid out by the
// viewer's day, the viewer's time first and the student's own clock beside it when it differs
// (docs/34). Picked, never typed (rule 6): a slot is an instant, sent as is. Text helpers take the
// viewer's zone from the screen (useViewerTz), so a zone change re-renders them.

/** A plain duration: the window is 7 × 24 h of instants, not calendar days. */
const DAY = 86_400_000;
const WINDOW_DAYS = 7;
const cities: Record<string, string | undefined> = t.tz;

export const cityOf = (tz: string): string => cities[tz] ?? ltr(tz);

/** GET /booking/slots `from`/`to`: now → 7 days on (the API caps a window at 14). */
export function slotWindow(now: Date): { from: string; to: string } {
  return { from: now.toISOString(), to: new Date(now.getTime() + WINDOW_DAYS * DAY).toISOString() };
}

/** The instant a local day (YYYY-MM-DD) begins in `tz` (wallToUtc: two offset reads, as before). */
export function dayStartUtc(date: string, tz: string): Date {
  return wallToUtc(date, 0, tz);
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
    weekday: weekdayOfDate(startsOn),
  };
}

interface SlotDay {
  /** The viewer's local date, YYYY-MM-DD. */
  date: string;
  /** «الأحد 4 أكتوبر». */
  label: string;
  slots: SlotView[];
}

/** «الأحد 4 أكتوبر» of an instant on the `tz` calendar (lessonWhenText without its clock). */
export function dayLabel(at: Date, tz: string): string {
  return lessonWhenText(at, tz, locale).replace(/\s\d{2}:\d{2}$/, '');
}

/** Only the slots with no clash, grouped by the viewer's day, earliest first. */
export function freeSlotDays(slots: readonly SlotView[], tz: string): SlotDay[] {
  const days = new Map<string, SlotDay>();
  const free = slots
    .filter((s) => s.conflicts.length === 0)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  for (const slot of free) {
    const at = new Date(slot.starts_at);
    const date = localDate(at, tz);
    const day = days.get(date) ?? { date, label: dayLabel(at, tz), slots: [] };
    day.slots.push(slot);
    days.set(date, day);
  }
  return [...days.values()];
}

/** A slot's big clock (the viewer's), and the student's `tz` clock under it when it differs. */
export function slotTimes(
  startsAt: string,
  tz: string,
  viewer: ViewerClock,
): { main: string; local: string | null } {
  const at = new Date(startsAt);
  const other = otherZoneClock(at, tz, { ...viewer, locale });
  const local = other && t.today.studentTime.replace('{time}', other).replace('{city}', cityOf(tz));
  return { main: clockIn(at, viewer.tz, viewer.cycle), local };
}

/** «الأحد 4 أكتوبر 17:00 بتوقيتك، عند الطالب الأحد 4 أكتوبر 18:00 بتوقيت الرياض». */
export function whenText(startsAt: string, tz: string, viewer: ViewerClock): string {
  const at = new Date(startsAt);
  const own = `${whenIn(at, viewer.tz, viewer.cycle)} ${t.schedule.viewerTime}`;
  if (sameClockAt(at, { a: tz, b: viewer.tz })) return own;
  const local = t.schedule.inCity
    .replace('{time}', whenIn(at, tz, viewer.cycle))
    .replace('{city}', cityOf(tz));
  return `${own}${t.common.listSeparator}${t.booking.studentLocal.replace('{time}', local)}`;
}
