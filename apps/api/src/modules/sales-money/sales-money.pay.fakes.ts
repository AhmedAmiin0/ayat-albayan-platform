// Fixtures of the payment scenario (test-only, excluded from the build).
import { SUB_ID } from '../subscriptions/money.fakes';

export { PAYMENT_ID, paymentRow, STUDENT_ID, SUB_ID } from '../subscriptions/money.fakes';

/** The admin's own POST /payments body (no receipt: allowed for the admin). */
export const ADMIN_PAY = { subscriptionId: SUB_ID, amount: 145, currency: 'SAR', method: 'bank', paidAt: '2026-10-01T09:00:00Z' };
