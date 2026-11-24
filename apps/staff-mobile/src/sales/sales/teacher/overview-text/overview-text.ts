import { inWeekOrder, type SalesOverviewStudent } from '@ab/shared';
import { wallParts } from '@ab/schedule';
import type { ClockCycle } from '@ab/time';
import type { SalesTeacherOverview, SalesTeacherSlot } from '@ab/shared';
import { hhmm } from '@/core/lib/clock';
import { t, ltr } from '@ab/mobile-kit';
import { fill } from '@/sales/sales/lib/sales-text';

const weekdays: Record<string, string | undefined> = t.enums.weekday;
const o = t.sales.teachers.overview;

/** Weekday and time on the viewer's clock from `at` (docs/34); an old payload keeps Riyadh's. */
function inViewerZone(slot: SalesTeacherSlot, tz: string): SalesTeacherSlot {
  if (!slot.at) return slot;
  const { weekday, time } = wallParts(slot.at, tz);
  return { ...slot, weekday, time };
}

/** Slots Saturday to Friday, by time within a day, on the viewer's `tz` clock. */
export function slotsInWeekOrder(
  slots: readonly SalesTeacherSlot[],
  tz: string,
): SalesTeacherSlot[] {
  const own = slots.map((slot) => inViewerZone(slot, tz));
  return inWeekOrder(own.sort((a, b) => a.time.localeCompare(b.time)));
}

export function slotLine(slot: SalesTeacherSlot, cycle: ClockCycle, tz: string): string {
  const { weekday, time } = inViewerZone(slot, tz);
  const day = weekdays[String(weekday)] ?? '';
  return fill(o.slot, { day, time: hhmm(time, cycle), minutes: String(slot.duration_min) });
}

export const studentsLine = (students: readonly SalesOverviewStudent[]): string =>
  students.map((s) => (s.code ? `${s.name} ${ltr(s.code)}` : s.name)).join(' · ');

export function totalsLine(totals: SalesTeacherOverview['attendance']['totals']): string {
  return fill(o.totals, Object.fromEntries(Object.entries(totals).map(([k, n]) => [k, String(n)])));
}
