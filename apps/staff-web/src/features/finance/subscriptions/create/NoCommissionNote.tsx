import { subscriptionAlreadyStarted } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';

type Props = {
  /** The picked first day (YYYY-MM-DD). */
  startsOn: string;
  /** «حلقات مستخدمة من الباقة» as sent (0 when not asked). */
  usedBefore: number;
  /** Stands in for the package's created_at; default now. */
  now?: Date;
};

/**
 * «لا عمولة لأن الدورة بدأت قبل التسجيل» (owner 2026-10-28, migration 20261028000942): one line under the
 * first day when the course already started (a day before today in Riyadh, or lessons used before).
 */
export function NoCommissionNote({ startsOn, usedBefore, now }: Props) {
  const createdAt = (now ?? new Date()).toISOString();
  if (!subscriptionAlreadyStarted({ starts_on: startsOn, created_at: createdAt, lessons_used_before: usedBefore })) return null;
  return <p className="text-xs text-ink-3">{t.salesMoney.noCommissionStarted}</p>;
}
