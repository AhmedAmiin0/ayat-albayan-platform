import { formatAmount, RIYADH_TZ, type ClockCycle, type TeacherEarningView } from '@ab/shared';
import { clockIn } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { instantDay } from '@/payments/format';
import { ltr } from '@/core/ui/primitives/Ltr';

/** «145 ج.م»: teacher money is EGP. */
export const egp = (amount: number): string => `${ltr(formatAmount(amount))} ${t.earnings.currency}`;

/** «1 أكتوبر 2026 · 17:00» / «… · 5:00 م» (the app's clock is Riyadh, docs/07 §12). */
export const sessionWhen = (iso: string, cycle: ClockCycle): string => `${instantDay(iso)} · ${clockIn(new Date(iso), RIYADH_TZ, cycle)}`;

/** «45 دقيقة · سهيلة، محمد». */
export function sessionDetail(row: Pick<TeacherEarningView, 'minutes' | 'students'>): string {
  const minutes = t.earnings.minutes.replace('{count}', String(row.minutes));
  return [minutes, row.students.join(t.common.listSeparator)].filter(Boolean).join(' · ');
}
