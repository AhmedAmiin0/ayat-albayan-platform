import { inWeekOrder, RIYADH_TZ, wallParts, type ClockCycle, type SalesWeeklySlot } from '@ab/shared';
import { hhmm } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { fill } from '../lib/sales-text';

// «الجدول» of «تفاصيل الطالب» in words (owner 2026-10-27): a weekly slot's days and time in Riyadh, the
// student's own clock when the rule's zone differs. Read from the UTC instants of each day's next
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

/** «عند الطالب: الأحد الساعة 6:00 م بتوقيت القاهرة», only when the rule's zone is not Riyadh. */
export function studentLine(slot: Pick<SalesWeeklySlot, 'next' | 'tz'>, cycle: ClockCycle): string | null {
  if (slot.tz === RIYADH_TZ) return null;
  const days = fill(t.schedule.inCity, { time: daysAt(slot.next, slot.tz, cycle), city: cities[slot.tz] ?? ltr(slot.tz) });
  return fill(s.studentTime, { days });
}

/** «مع أبرار · 45 دقيقة». */
export function slotMeta(slot: Pick<SalesWeeklySlot, 'teacher_name' | 'duration_min'>): string {
  const teacher = slot.teacher_name ? fill(t.today.withTeacher, { teacher: slot.teacher_name }) : null;
  return [teacher, durations[String(slot.duration_min)]].filter(Boolean).join(' · ');
}
