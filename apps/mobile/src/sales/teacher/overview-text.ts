import { inWeekOrder, type ClockCycle, type SalesOverviewStudent, type SalesTeacherOverview, type SalesTeacherSlot } from '@ab/shared';
import { hhmm } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { fill } from '../lib/sales-text';

// A teacher's «الجدول» and «الحضور» in words (owner 2026-10-28). Pure, unit-tested.

const weekdays: Record<string, string | undefined> = t.enums.weekday;
const o = t.sales.teachers.overview;

/** The slots السبت → الجمعة, by time within a day (the API sends them by weekday, then time). */
export const slotsInWeekOrder = (slots: readonly SalesTeacherSlot[]): SalesTeacherSlot[] =>
  inWeekOrder([...slots].sort((a, b) => a.time.localeCompare(b.time)));

/** «الأحد الساعة 8:00 م · 45 دقيقة» (Riyadh, the phone's 12 / 24 h). */
export const slotLine = (slot: SalesTeacherSlot, cycle: ClockCycle): string =>
  fill(o.slot, { day: weekdays[String(slot.weekday)] ?? '', time: hhmm(slot.time, cycle), minutes: String(slot.duration_min) });

/** «ياسمين AB-0101 · يوسف»: each student with their code when there is one. */
export const studentsLine = (students: readonly SalesOverviewStudent[]): string =>
  students.map((s) => (s.code ? `${s.name} ${ltr(s.code)}` : s.name)).join(' · ');

/** «عُقدت 12 · غياب الطالب 1 · …». */
export function totalsLine(totals: SalesTeacherOverview['attendance']['totals']): string {
  return fill(o.totals, Object.fromEntries(Object.entries(totals).map(([k, n]) => [k, String(n)])));
}
