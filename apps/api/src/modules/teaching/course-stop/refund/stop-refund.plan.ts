import type { StopRefund } from '@ab/shared';
import { uuidFor } from '@/modules/finance/stripe';
import type { CardState } from './stop-refund.cards';
import type { MoneyRow, RefundPackage } from './stop-refund.repo';

/** The package a refund is planned for. */
export interface RefundSub {
  id: string;
  studentId: string;
  currency: string;
}

/** What one stop may refund and where it would go. */
export interface RefundPlan {
  sub: RefundSub;
  pkg: RefundPackage;
  calc: StopRefund;
  cards: CardState[];
  rows: MoneyRow[];
  requestId: string;
  /** The amount asked (at most calc.refund). */
  amount: number;
}

/** The manual refund row's client_request_id: one per stop (rule 8). */
export const manualRefundKey = (requestId: string): string =>
  uuidFor(`course-stop-refund:${requestId}`);
