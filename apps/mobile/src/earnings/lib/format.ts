import { formatAmount, intlLocale, RIYADH_TZ, type TeacherEarningView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { instantDay } from '@/payments/format';
import { ltr } from '@/core/ui/primitives/Ltr';

/** «145 ج.م»: teacher money is EGP. */
export const egp = (amount: number): string => `${ltr(formatAmount(amount))} ${t.earnings.currency}`;

const clock = new Intl.DateTimeFormat(intlLocale(locale), {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: RIYADH_TZ,
});

/** «1 أكتوبر 2026 · 17:00» (the app's clock is Riyadh, docs/07 §12). */
export const sessionWhen = (iso: string): string => `${instantDay(iso)} · ${clock.format(new Date(iso))}`;

/** «45 دقيقة · سهيلة، محمد». */
export function sessionDetail(row: Pick<TeacherEarningView, 'minutes' | 'students'>): string {
  const minutes = t.earnings.minutes.replace('{count}', String(row.minutes));
  return [minutes, row.students.join(t.common.listSeparator)].filter(Boolean).join(' · ');
}
