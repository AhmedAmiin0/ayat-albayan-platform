// Fixtures of the sales money HTTP tests (test-only, excluded from the build).
import { SETTING_DEFAULTS } from '@ab/shared';
import { paymentRow, STUDENT_ID, SUB_ID, subRow, WEEKLY_SA } from '../subscriptions/money/money.fakes';
import type { Mocks } from '../subscriptions/test-app';
import { SALES_A } from '../subscriptions/test-app';

export const REQ = '9a000000-0000-4000-8000-000000000001';
export const MSG = '9b000000-0000-4000-8000-000000000001';
export const FAMILY_PHONE = '+966551110000';
export const RECEIPT = `${SUB_ID}/0f0e0d0c-0000-4000-8000-000000000001.jpg`;
export const OWN_A = { leadIds: [], guardianIds: ['g1'], studentIds: [STUDENT_ID], phones: [FAMILY_PHONE] };
export const NONE = { leadIds: [], guardianIds: [], studentIds: [], phones: [] };
export const PAY = { subscriptionId: SUB_ID, amount: 145, currency: 'SAR', paidAt: '2026-10-11T09:00:00Z', receiptPath: RECEIPT, clientRequestId: REQ };
/** No startsOn: the default day (today, Riyadh); explicit days are in sales-money.http.start*.test.ts. */
export const CREATE = { studentId: STUDENT_ID, pricing: { tier: 'weekly' }, clientRequestId: REQ };

/** salesA owns STUDENT_ID (her family, +966551110000); salesB owns nothing; the student is still in trial. */
export function salesDefaults(m: Mocks): void {
  m.sales.ownership.mockImplementation(async (id: string) => (id === SALES_A.id ? OWN_A : NONE));
  m.family.familyPhone.mockResolvedValue(FAMILY_PHONE);
  m.family.studentStatus.mockResolvedValue('active');
  m.subs.studentForQuote.mockResolvedValue({ id: STUDENT_ID, country: 'SA' });
  m.pricing.quote.mockResolvedValue(WEEKLY_SA);
  m.subs.insert.mockResolvedValue(subRow());
  m.subs.get.mockResolvedValue(subRow());
  m.payments.subscription.mockResolvedValue({ id: SUB_ID, student_id: STUDENT_ID, currency: 'SAR' });
  m.payments.insert.mockResolvedValue(paymentRow({ recorded_by: SALES_A.id, receipt_path: RECEIPT }));
  m.payments.get.mockResolvedValue(paymentRow({ recorded_by: SALES_A.id, receipt_path: RECEIPT }));
  m.storage.exists.mockResolvedValue(true);
  m.activation.afterPayment.mockResolvedValue(true);
}

/** settings.sales_auto_assign OFF: bookings skip the ownership check (row 13), money never does. */
export const AUTO_ASSIGN_OFF = { ...SETTING_DEFAULTS, sales_auto_assign: false };
