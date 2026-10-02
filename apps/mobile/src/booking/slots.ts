import { clockTime, lessonWhenText, RIYADH_TZ, type SlotView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { ltr } from '@/ui/Ltr';
import { localDate } from '@/today/timeline';

// Free trial slots (R-SCH-06, R-SCH-01): the next 7 days of GET /booking/slots, laid out by the
// Riyadh day, Riyadh time first and the student's own clock beside it. Picked, never typed (rule 6).

const DAY = 86_400_000;
export const WINDOW_DAYS = 7;
const cities: Record<string, string | undefined> = t.tz;

export const cityOf = (tz: string): string => cities[tz] ?? ltr(tz);

/** GET /booking/slots `from`/`to`: now → 7 days on (the API caps a window at 14). */
export function slotWindow(now: Date): { from: string; to: string } {
  return { from: now.toISOString(), to: new Date(now.getTime() + WINDOW_DAYS * DAY).toISOString() };
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

export interface SlotDay {
  /** Riyadh local date, YYYY-MM-DD. */
  date: string;
  /** «الأحد 4 أكتوبر». */
  label: string;
  slots: SlotView[];
}

/** «الأحد 4 أكتوبر» of an instant on the Riyadh calendar (lessonWhenText without its clock). */
function dayLabel(at: Date): string {
  return lessonWhenText(at, RIYADH_TZ).replace(/\s\d{2}:\d{2}$/, '');
}

/** Only the slots with no clash, grouped by Riyadh day, earliest first. */
export function freeSlotDays(slots: readonly SlotView[]): SlotDay[] {
  const days = new Map<string, SlotDay>();
  const free = slots
    .filter((s) => s.conflicts.length === 0)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  for (const slot of free) {
    const at = new Date(slot.starts_at);
    const date = localDate(at, RIYADH_TZ);
    const day = days.get(date) ?? { date, label: dayLabel(at), slots: [] };
    day.slots.push(slot);
    days.set(date, day);
  }
  return [...days.values()];
}

/** A slot's big Riyadh clock, and the student's clock under it when their zone differs. */
export function slotTimes(startsAt: string, tz: string): { riyadh: string; local: string | null } {
  const at = new Date(startsAt);
  const local =
    tz === RIYADH_TZ
      ? null
      : t.today.studentTime.replace('{time}', clockTime(at, tz)).replace('{city}', cityOf(tz));
  return { riyadh: clockTime(at, RIYADH_TZ), local };
}

/** «الأحد 4 أكتوبر 17:00 بتوقيت الرياض، عند الطالب الأحد 4 أكتوبر 16:00 بتوقيت القاهرة». */
export function whenText(startsAt: string, tz: string): string {
  const at = new Date(startsAt);
  const riyadh = `${lessonWhenText(at, RIYADH_TZ)} ${t.schedule.riyadhTime}`;
  if (tz === RIYADH_TZ) return riyadh;
  const local = t.schedule.inCity
    .replace('{time}', lessonWhenText(at, tz))
    .replace('{city}', cityOf(tz));
  return `${riyadh}، ${t.booking.studentLocal.replace('{time}', local)}`;
}

/** The legend over the slots: whose clock is big and whose is small. */
export function slotLegend(tz: string): string {
  return tz === RIYADH_TZ
    ? t.booking.tzNote.replace('{city}', cityOf(RIYADH_TZ))
    : t.booking.slotLegend.replace('{city}', cityOf(tz));
}
