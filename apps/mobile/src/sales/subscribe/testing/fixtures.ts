import {
  DEFAULT_RENEWAL_PRICING,
  type SalesChatReceipt,
  type SalesFamilyStudent,
  type SalesFamilyView,
  type SalesMoneySubscriptionView,
  type SalesPaymentView,
  type SalesQuoteView,
} from '@ab/shared';
import { thread } from '@/inbox/shared/thread-fixtures';

// Invented answers of the salesperson's money endpoints (no real people).

export const PHONE = '+966501112223';
export const KID = '66666666-6666-4666-8666-666666666666';
export const KID2 = '77777777-7777-4777-8777-777777777777';
export const SUB = '88888888-8888-4888-8888-888888888888';
export const MSG = '99999999-9999-4999-8999-999999999999';

export const familyThread = { ...thread, phone_e164: PHONE, guardian_id: 'g-9', lead_id: null, lead_status: null, guardian_tz: 'Asia/Riyadh' };

export function openSub(fields: Partial<SalesMoneySubscriptionView> = {}): SalesMoneySubscriptionView {
  return {
    id: SUB,
    student: { id: KID, code: 'AB-0201', name: 'ريم' },
    package: '12',
    duration: 45,
    lessons_total: 12,
    price: 180,
    currency: 'SAR',
    starts_on: '2026-10-12',
    status: 'active',
    paid: 0,
    due: 180,
    ...fields,
  };
}

export function kid(fields: Partial<SalesFamilyStudent> = {}): SalesFamilyStudent {
  return { id: KID, code: 'AB-0201', name: 'ريم', status: 'trial', open: [], renew_due: false, renewal: DEFAULT_RENEWAL_PRICING, teacher_id: null, ...fields };
}

export const familyOf = (...students: SalesFamilyStudent[]): SalesFamilyView => ({ students });

export const salesQuote: SalesQuoteView = {
  package: 'standard',
  lessons: 12,
  duration: 45,
  currency: 'SAR',
  discount: 0,
  afterDiscount: 180,
  perLesson: 15,
};

export function salesPayment(status: SalesPaymentView['student']['status'] = 'active'): SalesPaymentView {
  return {
    id: 'p-1',
    subscription_id: SUB,
    student: { id: KID, code: 'AB-0201', name: 'ريم', status },
    amount: 180,
    currency: 'SAR',
    method: 'bank',
    kind: 'payment',
    paid_at: '2026-10-12T09:00:00.000Z',
    note: null,
    created_at: '2026-10-12T09:00:01.000Z',
  };
}

export const chatImage: SalesChatReceipt = {
  message_id: MSG,
  created_at: '2026-10-11T18:00:00Z',
  mime: 'image/jpeg',
  caption: 'إيصال التحويل',
  expired: false,
};

export const expiredImage: SalesChatReceipt = {
  message_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  created_at: '2026-09-01T18:00:00Z',
  mime: 'image/png',
  caption: null,
  expired: true,
};
