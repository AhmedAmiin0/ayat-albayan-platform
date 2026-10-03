import { cents, parseAmount } from '@ab/shared';
import { t } from '@/lib/i18n';

export interface PayCheck {
  /** Valid amount (> 0, ≤ 2 decimals, ≤ what is due), else undefined. */
  amount?: number;
  error?: string;
}

/**
 * The typed amount against what is owed on the chosen sessions. A part-payment is fine (the API
 * pays the oldest first and the last one in part); more than the total due is refused here and on
 * the API (`over_payment`).
 */
export function checkAmount(text: string, due: number): PayCheck {
  const amount = parseAmount(text);
  if (amount === null) {
    return { error: text.trim() ? t.payments.mobile.amountInvalid : t.common.required };
  }
  if (cents(amount) > cents(due)) return { error: t.teacherEarnings.error.over_payment };
  return { amount };
}
