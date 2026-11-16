import { z } from 'zod';
import { apiErrorText } from '@/features/finance/subscriptions';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { minAmountText } from './link-text';

/** An amount refused under the floor (discount_not_allowed / discount_too_large with `min`). */
const belowFloor = z.object({ min: z.number(), currency: z.string() });

/**
 * A payment-link failure as text: its code through paymentLinks.error, anything unknown `fallback`
 * (the generic line). An amount under the floor says the lowest amount, not the pills' line
 * (2026-11-16: 10 SAR on a 180 SAR package read «خصم الحاسبة…»).
 */
export function paymentLinkErrorText(
  e: unknown,
  fallback: string = t.paymentLinks.error.generic,
): string {
  const floor = belowFloor.safeParse(e instanceof ApiError ? e.body : null);
  if (floor.success) return minAmountText(floor.data.min, floor.data.currency);
  const text = apiErrorText(e, t.paymentLinks.error);
  return text === t.common.error ? fallback : text;
}
