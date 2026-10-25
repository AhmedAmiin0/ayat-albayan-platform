import type { AdminTaskView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';

/** «قاربت الباقة على الانتهاء» / «انتهت الباقة وتحتاج إلى تجديد» (the student is the row's title). */
export function taskText(task: Pick<AdminTaskView, 'kind'>): string {
  return task.kind === 'renewal_due' ? t.mobileMoney.taskRenewalDue : t.mobileMoney.taskUnpaid;
}
