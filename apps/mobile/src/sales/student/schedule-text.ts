import { inWeekOrder, localizedName, wallParts, type ClockCycle, type SalesWeeklySlot } from '@ab/shared';
import { hhmm, type ViewerClock } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { ltr } from '@/core/ui/primitives/Ltr';
import { fill } from '../lib/sales-text';

// «الجدول» of «تفاصيل الطالب» in words (owner 2026-10-27): a weekly slot's days and time (viewer), the
// student's own clock (students.tz) when it reads differently. Read from the UTC instants of each day's next
// lesson, so a DST change or a day that moves across midnight reads right. Pure, unit-tested.

const weekdays: Record<string, string | undefined> = t.enums.weekday;
const durations: Record<string, string | undefined> = t.enums.duration;
const cities: Record<string, string | undefined> = t.tz;
const s = t.sales.student.schedule;

/** «الأحد · الثلاثاء · الخميس الساعة 7:00 م»: the days sharing a time, السبت → الجمعة, per time. */
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

/**
 * «عند الطالب: الأحد الساعة 6:00 م بتوقيت القاهرة» in the STUDENT's zone; null when the student's
 * days and clock read as the viewer's (Riyadh, Kuwait, Qatar for a Riyadh viewer).
 */
export function studentLine(slot: Pick<SalesWeeklySlot, 'next'>, tz: string, viewer: ViewerClock): string | null {
  const days = daysAt(slot.next, tz, viewer.cycle);
  if (days === weeklyLine(slot, viewer)) return null;
  return fill(s.studentTime, { days: fill(t.schedule.inCity, { time: days, city: cities[tz] ?? ltr(tz) }) });
}

/** The viewer's line, named «بتوقيتك» when the student's own line follows it, and that line. */
export function slotLines(
  slot: Pick<SalesWeeklySlot, 'next'>,
  tz: string,
  viewer: ViewerClock,
): { main: string; student: string | null } {
  const student = studentLine(slot, tz, viewer);
  const main = weeklyLine(slot, viewer);
  return { main: student ? `${main} ${t.schedule.viewerTime}` : main, student };
}

/** «مع أبرار · 45 دقيقة», the teacher's name in the app's language. */
export function slotMeta(slot: Pick<SalesWeeklySlot, 'teacher' | 'duration_min'>): string {
  const name = slot.teacher ? localizedName({ ar: slot.teacher.display_name_ar, en: slot.teacher.display_name_en }, locale) : null;
  const teacher = name ? fill(t.today.withTeacher, { teacher: name }) : null;
  return [teacher, durations[String(slot.duration_min)]].filter(Boolean).join(' · ');
}
