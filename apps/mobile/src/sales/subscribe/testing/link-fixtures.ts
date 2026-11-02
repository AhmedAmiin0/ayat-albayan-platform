import type { PaymentLinkQuoteView, PaymentLinkView } from '@ab/shared';
import { KID, salesQuote } from './fixtures';

// Invented answers of the «رابط دفع» endpoints (docs/30; no real people, no real link).

export const linkQuote = (fields: Partial<PaymentLinkQuoteView> = {}): PaymentLinkQuoteView => ({
  quote: salesQuote,
  max_discount_pct: 10,
  min_amount: 162,
  ...fields,
});

export function paymentLink(fields: Partial<PaymentLinkView> = {}): PaymentLinkView {
  return {
    id: 'l-1',
    url: 'https://app.example.test/pay/tok-1',
    kind: 'new',
    status: 'open',
    amount: 170,
    currency: 'SAR',
    reference_price: 180,
    student: { id: KID, code: 'AB-0201', name: 'ريم' },
    subscription_id: null,
    package: '12',
    lessons: 12,
    duration: 45,
    expires_at: '2099-11-01T09:00:00.000Z',
    paid_at: null,
    created_at: '2026-10-28T09:00:00.000Z',
    ...fields,
  };
}
