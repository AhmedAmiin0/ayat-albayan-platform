import type { PaymentKind, SubscriptionStatus } from '@ab/shared';
import { monthRange } from './months';

export type SubscriptionFilter = SubscriptionStatus | 'partial' | 'all';

/** GET /subscriptions query: «مدفوعة جزئيًا» is `paid=partial`, a status is `status=`, `student` is the name search. */
export function subscriptionParams(
  filter: SubscriptionFilter,
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
