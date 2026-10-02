import { counted, packageProgress, RIYADH_TZ } from '@ab/shared';
import { zonedParts } from '@/features/schedule/tz';
import { t } from '@/lib/i18n';
import type { TaskRow, UnpaidRow } from './types';

/** «باقة سهيلة قربت تخلص: فاضل حلقتين» (dashboard.task.<kind>, R-SUB-02 wording). */
export function taskText(task: Pick<TaskRow, 'kind' | 'student' | 'balance'>): string {
  const left = task.balance
    ? packageProgress(task.balance.used, task.balance.total, { forms: t.subscriptions.progress }).remainingLabel
    : '';
  return t.dashboard.task[task.kind].replace('{student}', task.student?.name ?? '').replace('{left}', left);
}

/** «4 حلقات في الشهر», or the counted lessons of a custom package («6 حلقات»). */
export function packageText(row: Pick<UnpaidRow, 'package' | 'lessons_total'>): string {
  return row.package ? t.enums.packageSize[row.package] : counted(t.pricing.customSessions, row.lessons_total);
}

/** The Riyadh day of a lesson: /admin/schedule snaps it to its week. */
export function scheduleWeekOf(startsAt: string): string {
  return zonedParts(new Date(startsAt), RIYADH_TZ).date;
}
