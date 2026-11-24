import { alertFor, packageProgress, type StudentBalanceView } from '@ab/money';
import { SETTING_DEFAULTS } from '@ab/settings';
import { t } from '@ab/mobile-kit';

/** settings.renewal_alert_remaining's default (docs/11 §2: 2), used until GET /settings answers. */
export const RENEWAL_DEFAULT = SETTING_DEFAULTS.renewal_alert_remaining;

export interface PackageLine {
  label: string;
  /** docs/07 §1.2: exactly when alertFor is due, never for a paused or trial package. */
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
