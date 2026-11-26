import type { PaymentView } from '../payments/payment-view.schemas';
import type { PayoutView } from '../payouts/payout-view.schemas';

export function aPaymentView(over: Partial<PaymentView> = {}): PaymentView {
  return {
    id: 'p1',
    subscription_id: 's1',
    student: { id: 'st1', code: 'AB-0001', name: 'سارة' },
    amount: 500,
    currency: 'EGP',
    method: 'cash',
    paid_at: '2026-11-01T10:00:00.000Z',
    receipt_path: null,
    recorded_by: { id: 'u1', full_name: 'أحمد' },
    note: null,
    created_at: '2026-11-01T10:00:00.000Z',
    kind: 'payment',
    original: null,
    invoice_id: null,
    ...over,
  };
}

export function aPayoutView(over: Partial<PayoutView> = {}): PayoutView {
  return {
    id: 'po1',
    teacher: { id: 't1', display_name_ar: 'معلمة' },
    month: '2026-10',
    lessons_count: 8,
    amount: 1200,
    currency: 'EGP',
    status: 'draft',
    approved_at: null,
    paid_at: null,
    breakdown: { lines: [], lesson_ids: [], statuses: [] },
    ...over,
  };
}
