import { DEFAULT_RENEWAL_PRICING, quote, type SalesFamilyStudent, type SalesMoneySubscriptionView, type SalesPaymentView, type SalesQuoteView } from '@ab/shared';

// Test rows shaped like the sales money endpoints (docs/16). Not imported by app code.

export const OPEN_SUB: SalesMoneySubscriptionView = {
  id: '0b6a7c1e-1111-4a8e-9b00-000000000001',
  student: { id: '0b6a7c1e-2222-4a8e-9b00-000000000002', code: 'AB-0183', name: 'سهيلة' },
  package: '8',
  duration: 45,
  lessons_total: 8,
  price: 290,
  currency: 'SAR',
  starts_on: '2026-10-12',
  status: 'unpaid',
  paid: 0,
  due: 290,
};

export function student(patch: Partial<SalesFamilyStudent> = {}): SalesFamilyStudent {
  return { ...OPEN_SUB.student, status: 'trial', open: [], renew_due: false, renewal: DEFAULT_RENEWAL_PRICING, teacher_id: null, ...patch };
}

export const SALES_QUOTE: SalesQuoteView = (() => {
  const q = quote({ tier: 'standard', duration: 45, country: 'SA', students: 1, discount: 0 });
  return {
    package: q.package,
    lessons: q.lessons,
    duration: q.duration,
    currency: q.currency,
    discount: q.discount,
    afterDiscount: q.afterDiscount,
    perLesson: q.perLesson,
  };
})();

export function paymentView(status: SalesPaymentView['student']['status'] = 'active'): SalesPaymentView {
  return {
    id: 'pay-1',
    subscription_id: OPEN_SUB.id,
    student: { ...OPEN_SUB.student, status },
    amount: 290,
    currency: 'SAR',
    method: 'bank',
    kind: 'payment',
    paid_at: '2026-10-12T09:00:00Z',
    note: null,
    created_at: '2026-10-12T09:00:00Z',
  };
}

export const CHAT_RECEIPTS = [
  { message_id: 'msg-img', created_at: '2026-10-11T10:00:00Z', mime: 'image/jpeg', caption: 'تحويل', expired: false },
  { message_id: 'msg-old', created_at: '2026-09-01T10:00:00Z', mime: 'image/png', caption: null, expired: true },
];
