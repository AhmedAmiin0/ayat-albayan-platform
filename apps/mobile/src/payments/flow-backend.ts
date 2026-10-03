import type { PaymentView, SubscriptionView } from '@ab/shared';
import { listItem, profile } from '@/students/test-data';
import { FakeBackend } from '@/test/fake-backend';
import { balanceOf, page, payment, SUB_ID, subscription } from './fixtures';

// The students + money API for the student → payment flow. POST /payments adds to the package's
// `paid`, and a package paid in full turns `active`, so the balance card shows the truth on refetch.

export const SIGNED = { bucket: 'receipts', path: `${SUB_ID}/9f.jpg`, token: 'tok', signed_url: 'http://x/sign' };

export function paymentBackend() {
  const state: { sub: SubscriptionView; payments: PaymentView[] } = {
    sub: subscription(),
    payments: [],
  };
  let nextId = 1;
  const backend = new FakeBackend()
    .on('GET /students', ({ query }) => {
      const hit = (query['search'] ?? '') === '' || listItem().name.includes(query['search'] ?? '');
      const items = hit ? [listItem()] : [];
      return { items, total: items.length, page: 1, pageSize: 25 };
    })
    .on('GET /students/:id', () => profile)
    .on('GET /students/:id/balance', () => balanceOf(state.sub))
    .on('GET /payments', () => page(state.payments))
    .on('GET /settings', () => ({ renewal_alert_remaining: 2, follow_up_hours: [2, 24, 72] }))
    .on('POST /payments/receipt-upload-url', () => SIGNED)
    .on('POST /payments', ({ body }) => {
      const input = body as { amount: number; method: PaymentView['method']; receiptPath?: string };
      const paid = state.sub.paid + input.amount;
      state.sub = { ...state.sub, paid, status: paid >= state.sub.price ? 'active' : state.sub.status };
      const row = payment({
        id: `pay-${nextId++}`,
        amount: input.amount,
        method: input.method,
        receipt_path: input.receiptPath ?? null,
      });
      state.payments = [row, ...state.payments];
      return row;
    });
  return { backend, state };
}
