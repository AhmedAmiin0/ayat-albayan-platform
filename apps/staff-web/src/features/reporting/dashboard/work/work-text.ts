import { counted } from '@ab/core';
import { packageProgress } from '@ab/money';
import { t } from '@ab/web-kit';
import type { TaskRow, UnpaidRow } from '@ab/money';

export function taskText(task: Pick<TaskRow, 'kind' | 'student' | 'balance'>): string {
  const left = task.balance
    ? packageProgress(task.balance.used, task.balance.total, { forms: t.subscriptions.progress })
        .remainingLabel
    : '';
  return t.dashboard.task[task.kind].replace('{student}', task.student?.name ?? '').replace('{left}', left);
}

export function packageText(row: Pick<UnpaidRow, 'package' | 'lessons_total'>): string {
  return row.package
    ? t.enums.packageSize[row.package]
    : counted(t.pricing.customSessions, row.lessons_total);
}
