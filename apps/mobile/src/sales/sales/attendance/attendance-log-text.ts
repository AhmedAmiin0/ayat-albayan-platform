import {
  dateText,
  type AttendanceTableRow,
  type AttendanceTotalKind,
  type ClockCycle,
  type StatusStyle,
} from '@ab/shared';
import { whenIn } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import type { LessonStatusText } from '@/core/ui/feedback/lesson-status';
import { ATTENDANCE_STYLE } from '@/sales/sales/student/attendance-text';
import { fill } from '@/sales/sales/lib/sales-text';

// What «سجل الحضور» says (owner 2026-10-28): the viewer's day and date, the month names, the
// totals, a row's chip and tags. The chips are «الحضور»'s (ATTENDANCE_STYLE) and the lesson statuses'. Pure.

const DAY_DATE = { weekday: 'short', day: 'numeric', month: 'numeric' } as const;
const MONTH = { month: 'long', year: 'numeric' } as const;

/** «الثلاثاء، 27/10»: the lesson's weekday and date on the viewer's calendar `tz`. */
export function dayDateOf(iso: string, tz: string): string {
  return dateText(new Date(iso), { tz, locale }, DAY_DATE);
}

/** "2026-10" → «أكتوبر 2026». */
export const monthOf = (month: string): string =>
  dateText(new Date(`${month}-15T12:00:00Z`), { tz: 'UTC', locale }, MONTH);

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
 * or moved lesson by its status (who cancelled it, «تغيّر موعدها»; `status` follows the academy's
 * lesson_confirmation_required, useLessonStatusText).
 */
export function rowChip(
  row: Pick<AttendanceTableRow, 'kind' | 'status'>,
  status: Pick<LessonStatusText, 'look' | 'label'>,
): StatusStyle & { label: string } {
  if (row.kind === null || row.kind === 'cancelled') return { ...status.look(row.status), label: status.label(row.status) };
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

type MoveRow = Pick<AttendanceTableRow, 'moved_to' | 'moved_from' | 'move_reason'>;

/**
 * Under a moved lesson (docs/47): «نُقلت إلى …», «بدلًا من موعد …» and «سبب تغيير الموعد: …»,
 * only those the row carries (an old API sends none), the times in `tz` on the viewer's clock.
 */
export function moveLines(row: MoveRow, tz: string, cycle: ClockCycle): string[] {
  const w = t.sales.student.log;
  const when = (iso: string) => whenIn(new Date(iso), tz, cycle);
  const lines: [string | null | undefined, (value: string) => string][] = [
    [row.moved_to, (v) => fill(w.movedTo, { when: when(v) })],
    [row.moved_from, (v) => fill(w.movedFrom, { when: when(v) })],
    [row.move_reason, (v) => fill(w.moveReason, { reason: v })],
  ];
  return lines.flatMap(([value, text]) => (value ? [text(value)] : []));
}

/**
 * The report cell: the staff logs say sent / not sent; the teacher's file passes her action's word
 * (docs/47 «تعديل التقرير» …), or null for a row that offers none («—»).
 */
export function reportCell(
  row: Pick<AttendanceTableRow, 'report_sent'>,
  label?: string | null,
): { text: string; active: boolean } {
  const w = t.sales.student.log;
  const sent = row.report_sent;
  if (label === undefined) return { text: sent ? w.sent : w.notSent, active: sent };
  return label ? { text: label, active: true } : { text: '—', active: false };
}
