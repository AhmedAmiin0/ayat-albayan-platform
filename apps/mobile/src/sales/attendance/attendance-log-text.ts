import {
  intlLocale,
  lessonStatusStyle,
  type AttendanceTableRow,
  type AttendanceTotalKind,
  type StatusStyle,
} from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { ATTENDANCE_STYLE } from '../student/attendance-text';
import { fill } from '../lib/sales-text';

// What «سجل الحضور» says (owner 2026-10-28): the viewer's day and date, the month names, the
// totals, a row's chip and tags. The chips are «الحضور»'s (ATTENDANCE_STYLE) and the lesson statuses'. Pure.

const monthName = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: 'UTC', month: 'long', year: 'numeric' });

const dayDates = new Map<string, Intl.DateTimeFormat>();

/** «الثلاثاء، 27/10»: the lesson's weekday and date on the viewer's calendar `tz`. */
export function dayDateOf(iso: string, tz: string): string {
  const opts = { timeZone: tz, weekday: 'short', day: 'numeric', month: 'numeric' } as const;
  const format = dayDates.get(tz) ?? new Intl.DateTimeFormat(intlLocale(locale), opts);
  dayDates.set(tz, format);
  return format.format(new Date(iso));
}

/** "2026-10" → «أكتوبر 2026». */
export const monthOf = (month: string): string => monthName.format(new Date(`${month}-15T12:00:00Z`));

/** The totals row, in the owner's order: حضر · غاب · بعذر · متأخر · ألغيت · أُجّلت. */
export function totalsItems(totals: Record<AttendanceTotalKind, number>): { key: string; label: string; n: number }[] {
  const w = t.sales.student.log.totals;
  return [
    { key: 'held', label: w.held, n: totals.held },
    { key: 'absent', label: w.absent, n: totals.absent },
    { key: 'excused', label: w.excused, n: totals.excused },
    { key: 'late', label: w.late, n: totals.late },
    { key: 'cancelled', label: w.cancelled, n: totals.cancelled_by_teacher + totals.cancelled_by_admin },
    { key: 'rescheduled', label: w.rescheduled, n: totals.rescheduled },
  ];
}

/**
 * The status chip: the student's own day as «الحضور» says it (حضر / غاب / اعتذر / لم يُسجَّل); a cancelled
 * or moved lesson by its status (who cancelled it, «تغيّر موعدها»).
 */
export function rowChip(row: Pick<AttendanceTableRow, 'kind' | 'status'>): StatusStyle & { label: string } {
  if (row.kind === null || row.kind === 'cancelled') return { ...lessonStatusStyle[row.status], label: t.enums.lessonStatus[row.status] };
  return { ...ATTENDANCE_STYLE[row.kind], label: t.sales.student.kind[row.kind] };
}

/** «تجريبية» · «تعويضية» · «موعد بديل» · «متأخر», in that order, only those that apply. */
export function rowTags(row: AttendanceTableRow): string[] {
  const w = t.sales.student.log;
  return [
    ...(row.is_trial ? [w.trial] : []),
    ...(row.is_makeup ? [w.makeup] : []),
    ...(row.is_rescheduled ? [w.moved] : []),
    ...(row.kind === 'present' && row.attendance === 'late' ? [w.late] : []),
  ];
}

/** «سبب الإلغاء: …» under a cancelled lesson, else null. */
export const cancelLine = (row: Pick<AttendanceTableRow, 'cancel_reason'>): string | null =>
  row.cancel_reason ? fill(t.sales.student.log.cancelReason, { reason: row.cancel_reason }) : null;
