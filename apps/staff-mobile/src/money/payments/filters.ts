import type { PaymentKind } from '@ab/shared';
import type { SubscriptionFilter } from '@ab/client-core';
import { monthRange } from '@/money/shared/months';

/** Partial maps to `paid=partial`; `student` is the name search. */
export function subscriptionParams(
  filter: SubscriptionFilter | 'all',
  student: string,
): Record<string, string | undefined> {
  return {
    status: filter === 'all' || filter === 'partial' ? undefined : filter,
    paid: filter === 'partial' ? 'partial' : undefined,
    student: student || undefined,
  };
}

/** GET /payments query: the type and the month (YYYY-MM or 'all'); `all` leaves a filter out. */
export function paymentParams(
  kind: PaymentKind | 'all',
  month: string,
): Record<string, string | undefined> {
  return {
    kind: kind === 'all' ? undefined : kind,
    ...(month === 'all' ? {} : monthRange(month)),
  };
}
