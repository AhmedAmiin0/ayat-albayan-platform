import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';
import { attachment, PAYMENT_ID, paymentRow } from '../../sales/sales-money/sales-money.pay.fakes';

const RECEIPT = attachment(9);
const ROWS = [
  { id: 'att-1', path: attachment(1), mime: 'image/jpeg', size: 2048, created_at: '2026-10-12T09:00:00Z' },
  { id: 'att-2', path: attachment(2), mime: 'application/pdf', size: 4096, created_at: '2026-10-12T09:01:00Z' },
];
const EXPIRES = '2026-10-12T11:00:00Z';

describe('GET /payments/:id/attachments and delete (docs/11 §7)', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    m.payments.get.mockResolvedValue(paymentRow({ receipt_path: RECEIPT }));
    m.attachments.forPayment.mockResolvedValue(ROWS);
    m.storage.signedDownload.mockImplementation(async (ref: { path: string }) => ({ url: `https://s/${ref.path}`, expires_at: EXPIRES }));
  });

  it('the legacy receipt first (id receipt), then the files oldest first, each signed', async () => {
    const res = await call({ method: 'GET', url: `/payments/${PAYMENT_ID}/attachments` });
    expect(res.statusCode).toBe(200);
    expect(m.attachments.forPayment).toHaveBeenCalledWith(PAYMENT_ID);
    expect(res.json()).toEqual([
      { id: 'receipt', mime: null, size: null, legacy: true, url: `https://s/${RECEIPT}`, expires_at: EXPIRES },
      { id: 'att-1', mime: 'image/jpeg', size: 2048, legacy: false, url: `https://s/${attachment(1)}`, expires_at: EXPIRES },
      { id: 'att-2', mime: 'application/pdf', size: 4096, legacy: false, url: `https://s/${attachment(2)}`, expires_at: EXPIRES },
    ]);
    expect(res.body).not.toContain('path');
  });

  it('no receipt and no files → []; an unknown payment → 404 payment_not_found', async () => {
    m.payments.get.mockResolvedValue(paymentRow());
    m.attachments.forPayment.mockResolvedValue([]);
    expect((await call({ method: 'GET', url: `/payments/${PAYMENT_ID}/attachments` })).json()).toEqual([]);
    m.payments.get.mockResolvedValue(null);
    const none = await call({ method: 'GET', url: `/payments/${PAYMENT_ID}/attachments` });
    expect([none.statusCode, none.json().code]).toEqual([404, 'payment_not_found']);
  });

  it('a file whose object is gone is skipped, never failing the list', async () => {
    m.storage.signedDownload.mockImplementation(async (ref: { path: string }) => {
      if (ref.path === attachment(1)) throw new Error('object not found');
      return { url: `https://s/${ref.path}`, expires_at: EXPIRES };
    });
    const res = await call({ method: 'GET', url: `/payments/${PAYMENT_ID}/attachments` });
    expect(res.statusCode).toBe(200);
    expect(res.json().map((f: { id: string }) => f.id)).toEqual(['receipt', 'att-2']);
  });

  it('teachers and salespeople are refused (payments.read)', async () => {
    for (const token of ['teacher', 'salesA'] as const)
      expect((await call({ method: 'GET', url: `/payments/${PAYMENT_ID}/attachments`, token })).statusCode).toBe(403);
  });

  it('delete: the files are read before the row goes (cascade), then every object is discarded, best effort', async () => {
    m.storage.remove.mockImplementation(async (ref: { path: string }) => {
      if (ref.path === attachment(2)) throw new Error('storage down');
    });
    expect((await call({ method: 'DELETE', url: `/payments/${PAYMENT_ID}` })).statusCode).toBe(204);
    const order = [m.attachments.forPayment.mock.invocationCallOrder[0], m.payments.remove.mock.invocationCallOrder[0]];
    expect(order[0]).toBeLessThan(order[1] ?? 0);
    for (const path of [RECEIPT, attachment(1), attachment(2)])
      expect(m.storage.remove).toHaveBeenCalledWith({ bucket: 'receipts', path });
  });
});
