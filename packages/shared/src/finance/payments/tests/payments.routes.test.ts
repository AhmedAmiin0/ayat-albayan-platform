import { describe, expect, it } from 'vitest';
import { paymentRoutes } from '../payments.routes';

const line = (r: { method: string; path: string }) => `${r.method} ${r.path}`;
const ID = '00000000-0000-4000-8000-0000000000a1';

const payment = {
  id: ID,
  subscription_id: '00000000-0000-4000-8000-0000000000a2',
  student: { id: '00000000-0000-4000-8000-0000000000a3', code: 'AB-0001', name: 'S' },
  amount: 100,
  currency: 'USD',
  method: 'bank',
  paid_at: '2026-10-01T09:00:00.000Z',
  receipt_path: null,
  recorded_by: null,
  note: null,
  created_at: '2026-10-01T09:00:00.000Z',
  kind: 'payment',
  original: null,
  invoice_id: null,
};

describe('paymentRoutes', () => {
  it('keeps the paths the api serves today', () => {
    expect(Object.values(paymentRoutes).map(line)).toEqual([
      'GET /payments',
      'POST /payments',
      'POST /payments/receipt-upload-url',
      'GET /payments/:id',
      'GET /payments/:id/receipt',
      'GET /payments/:id/attachments',
      'PATCH /payments/:id',
      'DELETE /payments/:id',
    ]);
  });

  it('answers a payment as the api builds it and refuses an unknown method', () => {
    expect(paymentRoutes.get.response.parse(payment)).toEqual(payment);
    expect(paymentRoutes.get.response.safeParse({ ...payment, method: 'gold' }).success).toBe(false);
  });

  it('pages the list with the default size and refuses a range that ends before it starts', () => {
    const q = paymentRoutes.list.query;
    expect(q.parse({})).toMatchObject({ page: 1, pageSize: 25 });
    expect(q.safeParse({ from: '2026-10-02', to: '2026-10-01' }).error?.issues[0]?.message).toBe(
      'invalid_range',
    );
  });

  it('keeps only the fields a patch sends', () => {
    expect(paymentRoutes.update.body.parse({ amount: 50 })).toEqual({ amount: 50 });
  });

  it('refuses a payment id that is not a uuid', () => {
    expect(paymentRoutes.get.params.safeParse({ id: 'p1' }).success).toBe(false);
    expect(paymentRoutes.remove.params.parse({ id: ID })).toEqual({ id: ID });
  });
});
