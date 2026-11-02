import { subscriptionAlreadyStarted } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';

interface NoCommissionNoteProps {
  /** The picked first day (YYYY-MM-DD). */
  startsOn: string;
  /** «حلقات مستخدمة من الباقة» as sent (0 when not asked). */
  usedBefore: number;
  /** Stands in for the package's created_at. */
  now: Date;
}

/**
 * «لا عمولة لأن الدورة بدأت قبل التسجيل» (owner 2026-10-28, migration 20261028000942): one line under the
 * first day when the course already started (a day before today in Riyadh, or lessons used before).
 */
export function NoCommissionNote({ startsOn, usedBefore, now }: NoCommissionNoteProps) {
  const fact = { starts_on: startsOn, created_at: now.toISOString(), lessons_used_before: usedBefore };
  return subscriptionAlreadyStarted(fact) ? <Note>{t.salesMoney.noCommissionStarted}</Note> : null;
}
