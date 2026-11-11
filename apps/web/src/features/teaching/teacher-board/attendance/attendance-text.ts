import { dateText, type AttendanceTableRow, type AttendanceTotalKind } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';

// What the web «سجل الحضور» says (docs/46 C5): month names, the totals line, a row's tags.

/** "2026-10" → «أكتوبر 2026» (mid-month UTC: no zone can push it to another month). */
export const monthLabel = (month: string): string =>
  dateText(new Date(`${month}-15T12:00:00Z`), { tz: 'UTC', locale }, { month: 'long', year: 'numeric' });

type Totals = Record<AttendanceTotalKind, number>;
const TOTALS: [keyof typeof t.sales.student.log.totals, (x: Totals) => number][] = [
  ['held', (x) => x.held],
  ['absent', (x) => x.absent],
  ['excused', (x) => x.excused],
  ['late', (x) => x.late],
  ['cancelled', (x) => x.cancelled_by_teacher + x.cancelled_by_admin],
  ['rescheduled', (x) => x.rescheduled],
];

/** «حضر 3 · غاب 1 · بعذر 0 · متأخر 0 · ألغيت 1 · أُجّلت 0». */
export const totalsLine = (totals: Totals): string =>
  TOTALS.map(([key, n]) => `${t.sales.student.log.totals[key]} ${n(totals)}`).join(' · ');

const TAGS: [(r: AttendanceTableRow) => boolean, () => string][] = [
  [(r) => r.is_trial, () => t.sales.student.log.trial],
  [(r) => r.is_makeup, () => t.sales.student.log.makeup],
  [(r) => r.is_rescheduled, () => t.sales.student.log.moved],
  [(r) => r.kind === 'present' && r.attendance === 'late', () => t.sales.student.log.late],
];

/** «تجريبية · تعويضية · موعد بديل · متأخر», only those that apply, then the cancel reason. */
export function rowNote(row: AttendanceTableRow): string {
  const tags = TAGS.filter(([applies]) => applies(row)).map(([, word]) => word());
  const reason = row.cancel_reason
    ? [t.sales.student.log.cancelReason.replace('{reason}', row.cancel_reason)]
    : [];
  return [...tags, ...reason].join(' · ');
}
