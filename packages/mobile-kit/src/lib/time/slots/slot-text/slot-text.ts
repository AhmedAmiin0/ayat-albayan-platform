import { lessonWhenAt, lessonWhenText } from '@ab/shared';
import { clockOf, localDateIn, otherZoneClock, sameClockAt, type ClockCycle } from '@ab/time';
import { t } from '../../../i18n/i18n';
import { locale } from '../../../i18n/locale';
import { ltr } from '../../../../ui/primitives/Ltr';

// A slot picker's words (R-SCH-06, docs/34), shared by the staff app and the family app: the
// viewer's time first and the student's own clock beside it when it differs. Picked, never typed
// (rule 6). The viewer's zone and cycle come from the screen (a prop), so a change re-renders.

/** Whose clock the times read on: the staff member's zone, or the family's (the student's). */
export interface ViewerClock {
  tz: string;
  cycle: ClockCycle;
}

const cities: Record<string, string | undefined> = t.tz;

/** A zone without an ar.json city keeps its id (LTR). */
export const cityOf = (tz: string): string => cities[tz] ?? ltr(tz);

/** The note over times read in the viewer's zone `tz`. */
export const zoneNote = (tz: string): string => t.schedule.zoneNote.replace('{city}', cityOf(tz));

interface SlotDay<S> {
  /** The viewer's local date, YYYY-MM-DD. */
  date: string;
  label: string;
  slots: S[];
}

/** An instant's day on the `tz` calendar (lessonWhenText without its clock). */
export function dayLabel(at: Date, tz: string): string {
  return lessonWhenText(at, tz, locale).replace(/\s\d{2}:\d{2}$/, '');
}

/** A slot with its clashes (staff) or a free one already (the family's: no `conflicts`). */
interface Slot {
  starts_at: string;
  conflicts?: readonly unknown[];
}

const isFree = (s: Slot): boolean => (s.conflicts?.length ?? 0) === 0;

/** Only the slots with no clash, grouped by the viewer's day, earliest first. */
export function freeSlotDays<S extends Slot>(slots: readonly S[], tz: string): SlotDay<S>[] {
  const days = new Map<string, SlotDay<S>>();
  const free = slots.filter(isFree).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  for (const slot of free) {
    const at = new Date(slot.starts_at);
    const date = localDateIn(at, tz);
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
  return { main: clockOf(at, { ...viewer, locale }), local };
}

export function whenText(startsAt: string, tz: string, viewer: ViewerClock): string {
  const at = new Date(startsAt);
  const own = `${lessonWhenAt(at, { ...viewer, locale })} ${t.schedule.viewerTime}`;
  if (sameClockAt(at, { a: tz, b: viewer.tz })) return own;
  const local = t.schedule.inCity
    .replace('{time}', lessonWhenAt(at, { tz, cycle: viewer.cycle, locale }))
    .replace('{city}', cityOf(tz));
  return `${own}${t.common.listSeparator}${t.booking.studentLocal.replace('{time}', local)}`;
}
