import type { PaymentLinkView } from '@ab/shared';

// A row of GET /sales/payment-links (test data only).
export function linkView(patch: Partial<PaymentLinkView> = {}): PaymentLinkView {
  return {
    id: 'link-1',
    url: 'https://app.example.com/pay/tok_1',
    kind: 'new',
    status: 'open',
    amount: 261,
    currency: 'SAR',
    reference_price: 290,
    student: { id: '0b6a7c1e-2222-4a8e-9b00-000000000002', code: 'AB-0183', name: 'سهيلة' },
    subscription_id: null,
    package: '8',
    lessons: 8,
    duration: 45,
    expires_at: '2099-11-04T09:00:00Z',
    paid_at: null,
    created_at: '2026-10-28T09:00:00Z',
    ...patch,
  };
}
