import { counted, formatAmount, packageProgress, type ClockCycle } from '@ab/shared';
import { whenIn } from '@/core/lib/clock';
import { t, isolate } from '@ab/mobile-kit';
import type { PendingReportRow, TaskRow, UnpaidRow } from '@ab/shared';

/** Same wording as the web. */
export function taskText(task: Pick<TaskRow, 'kind' | 'student' | 'balance'>): string {
  const left = task.balance
    ? packageProgress(task.balance.used, task.balance.total, { forms: t.subscriptions.progress })
        .remainingLabel
    : '';
  return t.dashboard.task[task.kind]
    .replace('{student}', task.student ? isolate(task.student.name) : '')
    .replace('{left}', left);
}

export function packageText(row: Pick<UnpaidRow, 'package' | 'lessons_total'>): string {
  return row.package
    ? t.enums.packageSize[row.package]
    : counted(t.pricing.customSessions, row.lessons_total);
}

/** On the viewer's clock (docs/34). */
export function pendingSubtitle(
  row: Pick<PendingReportRow, 'teacher' | 'starts_at'>,
  cycle: ClockCycle,
  tz: string,
): string {
  const when = whenIn(new Date(row.starts_at), tz, cycle);
  return `${t.students.withTeacher.replace('{teacher}', row.teacher.display_name_ar)} · ${when}`;
}

const currencies: Readonly<Record<string, string>> = t.pricing.currencies;

/** Falls back to the ISO code. */
export const currencyLabel = (code: string): string => currencies[code] ?? code;

export function unpaidSubtitle(row: UnpaidRow): string {
  const reason =
    row.reason === 'owes'
      ? `${t.dashboard.owes}: ${formatAmount(Math.round(row.owed))} ${currencyLabel(row.currency)}`
      : t.dashboard.renewalDue;
  return `${packageText(row)} · ${reason}`;
}
