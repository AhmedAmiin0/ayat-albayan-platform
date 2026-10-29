import { minLinkAmount, type PaymentLinkQuoteView } from '@ab/shared';
import type { Mock } from 'vitest';
import { linkView } from '@/features/sales/sales/money/links/link.fixture';
import { SALES_QUOTE } from '../sales-money-fixture';

// «دفع إلكتروني»'s specs (not app code): the calculator quote, the link quote and the link, answered by path.

export const LINK_QUOTE: PaymentLinkQuoteView = { quote: SALES_QUOTE, max_discount_pct: 10, min_amount: minLinkAmount(SALES_QUOTE.afterDiscount, 10) };
export const CREATED = linkView({ amount: 270, reference_price: SALES_QUOTE.afterDiscount });

export function answer(apiSend: Mock, quote: PaymentLinkQuoteView = LINK_QUOTE) {
  apiSend.mockImplementation(async (_method: string, path: string) =>
    path === '/sales/payment-links/quote' ? quote : path === '/sales/subscriptions/quote' ? SALES_QUOTE : CREATED,
  );
}
