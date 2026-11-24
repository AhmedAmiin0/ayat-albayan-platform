import { inWeekOrder, type SalesWeeklySlot } from '@ab/shared';
import { localizedName } from '@ab/core';
import { wallParts } from '@ab/schedule';
import type { ClockCycle } from '@ab/time';
import { hhmm, type ViewerClock } from '@/core/lib/clock';
import { t, locale, ltr } from '@ab/mobile-kit';
import { fill } from '@/sales/sales/lib/sales-text';

// Read from each day's next lesson instant, so DST and midnight shifts read right; pure.

const weekdays: Record<string, string | undefined> = t.enums.weekday;
const durations: Record<string, string | undefined> = t.enums.duration;
const cities: Record<string, string | undefined> = t.tz;
const s = t.sales.student.schedule;

/** Days sharing a time grouped, Saturday to Friday, per time. */
function daysAt(starts: readonly string[], tz: string, cycle: ClockCycle): string {
  const groups = new Map<string, number[]>();
  for (const at of starts) {
    const w = wallParts(at, tz);
    groups.set(w.time, [...(groups.get(w.time) ?? []), w.weekday]);
  }
  return [...groups]
    .map(([time, days]) => {
      const names = inWeekOrder(days.map((weekday) => ({ weekday }))).map((d) => weekdays[String(d.weekday)] ?? '');
      return fill(s.weekly, { days: names.join(' · '), time: hhmm(time, cycle) });
    })
    .join(t.common.listSeparator);
}

/** The slot on the viewer's clock (docs/34). */
export const weeklyLine = (slot: Pick<SalesWeeklySlot, 'next'>, viewer: ViewerClock): string =>
  daysAt(slot.next, viewer.tz, viewer.cycle);

/** The student's own zone line; null when the student's days and clock read as the viewer's. */
export function studentLine(slot: Pick<SalesWeeklySlot, 'next'>, tz: string, viewer: ViewerClock): string | null {
  const days = daysAt(slot.next, tz, viewer.cycle);
  if (days === weeklyLine(slot, viewer)) return null;
  return fill(s.studentTime, { days: fill(t.schedule.inCity, { time: days, city: cities[tz] ?? ltr(tz) }) });
}

export function slotLines(
  slot: Pick<SalesWeeklySlot, 'next'>,
  tz: string,
  viewer: ViewerClock,
): { main: string; student: string | null } {
  const student = studentLine(slot, tz, viewer);
  const main = weeklyLine(slot, viewer);
  return { main: student ? `${main} ${t.schedule.viewerTime}` : main, student };
}

export function slotMeta(slot: Pick<SalesWeeklySlot, 'teacher' | 'duration_min'>): string {
  const name = slot.teacher ? localizedName({ ar: slot.teacher.display_name_ar, en: slot.teacher.display_name_en }, locale) : null;
  const teacher = name ? fill(t.today.withTeacher, { teacher: name }) : null;
  return [teacher, durations[String(slot.duration_min)]].filter(Boolean).join(' · ');
}
