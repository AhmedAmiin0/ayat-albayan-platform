import { alertFor, packageProgress, type StudentBalanceView } from '@ab/shared';
import { t } from '@/lib/i18n';

/** settings.renewal_alert_remaining's default (docs/11 §2), used until GET /settings answers. */
export const RENEWAL_DEFAULT = 2;

export interface PackageLine {
  /** «فاضل حلقتين», «الباقة خلصت», «حضر حلقة زيادة عن الباقة». */
  label: string;
  /**
   * Saffron «دورك» (docs/07 §1.2): exactly when the renewal / unpaid alert is due (alertFor), so at
   * or under the threshold and never for a paused or trial package.
   */
  alert: boolean;
}

/**
 * The student's package line (docs/07 §6, R-SUB-01/02) from GET /students/:id/balance. It counts
 * what is left across every package, as the alerts do (FIFO: an early renewal adds to it).
 * null without a package (a trial student), so nothing is shown.
 */
export function packageLine(
  balance: StudentBalanceView | undefined,
  threshold: number = RENEWAL_DEFAULT,
): PackageLine | null {
  const current = balance?.current;
  if (!balance || !current) return null;
  const { remaining } = balance;
  const progress = packageProgress(current.lessons_total - remaining, current.lessons_total, {
    forms: t.subscriptions.progress,
    threshold,
  });
  const alert = alertFor({ remaining, threshold, status: current.status }) !== null;
  return { label: progress.remainingLabel, alert };
}
