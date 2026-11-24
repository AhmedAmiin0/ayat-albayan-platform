import type { AdminTaskView } from '@ab/money';
import { t } from '@ab/mobile-kit';

/** The student is the row's title. */
export function taskText(task: Pick<AdminTaskView, 'kind'>): string {
  return task.kind === 'renewal_due' ? t.mobileMoney.taskRenewalDue : t.mobileMoney.taskUnpaid;
}
