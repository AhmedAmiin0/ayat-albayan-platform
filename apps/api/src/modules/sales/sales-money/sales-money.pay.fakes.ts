// Fixtures of the payment scenario (test-only, excluded from the build).
import { SUB_ID } from '../../finance/subscriptions/money/money.fakes';

export { PAYMENT_ID, paymentRow, STUDENT_ID, SUB_ID } from '../../finance/subscriptions/money/money.fakes';

/** The admin's own POST /payments body (no receipt: allowed for the admin). */
export const ADMIN_PAY = { subscriptionId: SUB_ID, amount: 145, currency: 'SAR', method: 'bank', paidAt: '2026-10-01T09:00:00Z' };

/** The first bytes of a JPEG (what Storage returns for a real photo). */
export const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);

/** An uploaded file n (1..9) in the package's receipts folder. */
export const attachment = (n: number): string => `${SUB_ID}/0f0e0d0c-0000-4000-8000-00000000000${n}.jpg`;
