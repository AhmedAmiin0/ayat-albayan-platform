import { counted, formatAmount, lessonWhenText, packageProgress, RIYADH_TZ } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import type { PendingReportRow, TaskRow, UnpaidRow } from './dashboard-types';

/** «باقة سهيلة قاربت على الانتهاء: …» (dashboard.task.<kind>, same wording as the web). */
export function taskText(task: Pick<TaskRow, 'kind' | 'student' | 'balance'>): string {
  const left = task.balance
    ? packageProgress(task.balance.used, task.balance.total, { forms: t.subscriptions.progress })
        .remainingLabel
    : '';
  return t.dashboard.task[task.kind]
    .replace('{student}', task.student?.name ?? '')
    .replace('{left}', left);
}

/** «4 حلقات في الشهر», or the counted lessons of a custom package. */
export function packageText(row: Pick<UnpaidRow, 'package' | 'lessons_total'>): string {
  return row.package
    ? t.enums.packageSize[row.package]
    : counted(t.pricing.customSessions, row.lessons_total);
}

/** «مع المعلمة · الخميس 1 أكتوبر 16:00», in Riyadh time like the web. */
export function pendingSubtitle(row: Pick<PendingReportRow, 'teacher' | 'starts_at'>): string {
  const when = lessonWhenText(new Date(row.starts_at), RIYADH_TZ, locale);
  return `${t.students.withTeacher.replace('{teacher}', row.teacher.display_name_ar)} · ${when}`;
}

const currencies: Readonly<Record<string, string>> = t.pricing.currencies;

/** «ر.س» for the site currencies, else the ISO code. */
export const currencyLabel = (code: string): string => currencies[code] ?? code;

/** «المتبقي عليها: 1,200 ر.س» or «دُفعت كاملة…», after the package. */
export function unpaidSubtitle(row: UnpaidRow): string {
  const reason =
    row.reason === 'owes'
      ? `${t.dashboard.owes}: ${formatAmount(Math.round(row.owed))} ${currencyLabel(row.currency)}`
      : t.dashboard.renewalDue;
  return `${packageText(row)} · ${reason}`;
}
