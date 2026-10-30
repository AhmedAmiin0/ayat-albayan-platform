import { stripeProblemText, type StripeField, type StripeProblemKeys } from '@ab/client-core';
import { t } from '@/core/lib/i18n/i18n';

/** The shared check's problem key under `field` → its line (null = none). */
export function problemText(keys: StripeProblemKeys | null, field: StripeField): string | null {
  const key = keys?.[field];
  return key ? stripeProblemText(key, t.paymentLinks) : null;
}
