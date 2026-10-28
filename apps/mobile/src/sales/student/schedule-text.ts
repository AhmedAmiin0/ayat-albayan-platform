import { inWeekOrder, localizedName, RIYADH_TZ, wallParts, type ClockCycle, type SalesWeeklySlot } from '@ab/shared';
import { hhmm } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { ltr } from '@/core/ui/primitives/Ltr';
import { fill } from '../lib/sales-text';

// «الجدول» of «تفاصيل الطالب» in words (owner 2026-10-27): a weekly slot's days and time in Riyadh, the
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

/** The slot in Riyadh, the academy clock of every sales list. */
export const weeklyLine = (slot: Pick<SalesWeeklySlot, 'next'>, cycle: ClockCycle): string => daysAt(slot.next, RIYADH_TZ, cycle);

/**
 * «عند الطالب: الأحد الساعة 6:00 م بتوقيت القاهرة» in the STUDENT's zone (an imported rule is always in
 * Riyadh); null when the student's days and clock are Riyadh's (Riyadh, Kuwait, Qatar, Amman…).
 */
export function studentLine(slot: Pick<SalesWeeklySlot, 'next'>, tz: string, cycle: ClockCycle): string | null {
  const days = daysAt(slot.next, tz, cycle);
  if (days === weeklyLine(slot, cycle)) return null;
  return fill(s.studentTime, { days: fill(t.schedule.inCity, { time: days, city: cities[tz] ?? ltr(tz) }) });
}

/** The Riyadh line, named «بتوقيت الرياض» when the student's own line follows it, and that line. */
export function slotLines(slot: Pick<SalesWeeklySlot, 'next'>, tz: string, cycle: ClockCycle): { riyadh: string; student: string | null } {
  const student = studentLine(slot, tz, cycle);
  const riyadh = weeklyLine(slot, cycle);
  return { riyadh: student ? `${riyadh} ${t.schedule.riyadhTime}` : riyadh, student };
}

/** «مع أبرار · 45 دقيقة», the teacher's name in the app's language. */
export function slotMeta(slot: Pick<SalesWeeklySlot, 'teacher' | 'duration_min'>): string {
  const name = slot.teacher ? localizedName({ ar: slot.teacher.display_name_ar, en: slot.teacher.display_name_en }, locale) : null;
  const teacher = name ? fill(t.today.withTeacher, { teacher: name }) : null;
  return [teacher, durations[String(slot.duration_min)]].filter(Boolean).join(' · ');
}
