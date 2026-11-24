import type { AttendanceTableRow, AttendanceTotalKind } from '@ab/shared';
import type { StatusStyle } from '@ab/money';
import { dateText, monthText, type ClockCycle } from '@ab/time';
import { whenIn } from '@/core/lib/clock';
import { t, locale } from '@ab/mobile-kit';
import type { LessonStatusText } from '@/core/ui/feedback/lesson-status';
import { ATTENDANCE_STYLE } from '@/sales/sales/student/attendance-text';
import { fill } from '@/sales/sales/lib/sales-text';

const DAY_DATE = { weekday: 'short', day: 'numeric', month: 'numeric' } as const;

/** The lesson's weekday and date on the viewer's calendar `tz`. */
export function dayDateOf(iso: string, tz: string): string {
  return dateText(new Date(iso), { tz, locale }, DAY_DATE);
}

export const monthOf = (month: string): string => monthText(month, locale);

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

/** A cancelled or moved lesson shows its status, which follows lesson_confirmation_required. */
export function rowChip(
  row: Pick<AttendanceTableRow, 'kind' | 'status'>,
  status: Pick<LessonStatusText, 'look' | 'label'>,
): StatusStyle & { label: string } {
  if (row.kind === null || row.kind === 'cancelled') return { ...status.look(row.status), label: status.label(row.status) };
  return { ...ATTENDANCE_STYLE[row.kind], label: t.sales.student.kind[row.kind] };
}

export function rowTags(row: AttendanceTableRow): string[] {
  const w = t.sales.student.log;
  return [
    ...(row.is_trial ? [w.trial] : []),
    ...(row.is_makeup ? [w.makeup] : []),
    ...(row.is_rescheduled ? [w.moved] : []),
    ...(row.kind === 'present' && row.attendance === 'late' ? [w.late] : []),
  ];
}

export const cancelLine = (row: Pick<AttendanceTableRow, 'cancel_reason'>): string | null =>
  row.cancel_reason ? fill(t.sales.student.log.cancelReason, { reason: row.cancel_reason }) : null;

type MoveRow = Pick<AttendanceTableRow, 'moved_to' | 'moved_from' | 'move_reason'>;

/** Moved lesson lines (docs/47), only those the row carries (an old API sends none). */
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

/** The teacher's file passes her action word (docs/47); null means no action. */
export function reportCell(
  row: Pick<AttendanceTableRow, 'report_sent'>,
  label?: string | null,
): { text: string; active: boolean } {
  const w = t.sales.student.log;
  const sent = row.report_sent;
  if (label === undefined) return { text: sent ? w.sent : w.notSent, active: sent };
  return label ? { text: label, active: true } : { text: '—', active: false };
}
