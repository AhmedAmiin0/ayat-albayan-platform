import type { PaymentView } from '@ab/shared';
import type { Page } from '@/lib/paging';

/** One currency's net on GET /payments (payments minus refunds), as apps/api returns it. */
export interface PeriodTotal {
  currency: string;
  net: number;
  payments: number;
  refunds: number;
}

/** GET /payments: a page of payments plus the filter's totals per currency. */
export type PaymentsPage = Page<PaymentView> & { totals: PeriodTotal[] };
