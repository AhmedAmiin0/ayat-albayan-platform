import type { Page } from '@ab/core';
import type { PaymentView } from '../views';

/** One currency's net on GET /payments (payments minus refunds). */
export interface PeriodTotal {
  currency: string;
  net: number;
  payments: number;
  refunds: number;
}

/** GET /payments: a page of payments plus the filter's totals per currency. */
export type PaymentsPage = Page<PaymentView> & { totals: PeriodTotal[] };
