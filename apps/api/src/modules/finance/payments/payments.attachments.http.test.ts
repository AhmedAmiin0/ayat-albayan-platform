import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ADMIN, moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';
import { ADMIN_PAY, attachment as file, JPEG, PAYMENT_ID, paymentRow, STUDENT_ID, SUB_ID } from '../../sales/sales-money/sales-money.pay.fakes';

const post = (body: object) => ({ method: 'POST' as const, url: '/payments', body: { ...ADMIN_PAY, ...body } });

describe('POST /payments «المرفقات» (bank transfers only, docs/11 §7)', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    m.payments.subscription.mockResolvedValue({ id: SUB_ID, student_id: STUDENT_ID, currency: 'SAR' });
    m.payments.insert.mockResolvedValue(paymentRow());
    m.payments.get.mockResolvedValue(paymentRow());
    m.storage.info.mockResolvedValue({ size: 2048, contentType: 'image/jpeg' });
    m.storage.head.mockResolvedValue(JPEG);
  });

  it('saved after the payment: the sniffed mime, the stored size, the admin as creator; a repeated path once', async () => {
    const res = await call(post({ attachments: [file(1), file(2), file(1)] }));
    expect(res.statusCode).toBe(201);
    expect(m.attachments.save).toHaveBeenCalledWith([
      { payment_id: PAYMENT_ID, path: file(1), mime: 'image/jpeg', size: 2048, created_by: ADMIN.id },
      { payment_id: PAYMENT_ID, path: file(2), mime: 'image/jpeg', size: 2048, created_by: ADMIN.id },
    ]);
    expect(m.storage.head).toHaveBeenCalledWith({ bucket: 'receipts', path: file(1) }, 12);
  });

  it('cash (or any non-bank method) with files → 400 attachments_not_allowed, nothing written', async () => {
    const res = await call(post({ method: 'cash', attachments: [file(1)] }));
    expect([res.statusCode, res.json().code]).toEqual([400, 'attachments_not_allowed']);
    expect(m.payments.insert).not.toHaveBeenCalled();
    expect((await call(post({ method: 'cash', attachments: [] }))).statusCode).toBe(201);
  });

  it('more than 5 → 400 too_many_attachments', async () => {
    const res = await call(post({ attachments: [1, 2, 3, 4, 5, 6].map(file) }));
    expect([res.statusCode, res.json().issues[0].message]).toEqual([400, 'too_many_attachments']);
    expect(m.payments.insert).not.toHaveBeenCalled();
  });

  it('a path outside the package folder, or never uploaded → 400 attachment_path; nothing written', async () => {
    const other = await call(post({ attachments: [`5b000000-0000-4000-8000-0000000000ff/x.jpg`] }));
    expect([other.statusCode, other.json().code]).toEqual([400, 'attachment_path']);
    m.storage.info.mockResolvedValue(null);
    const missing = await call(post({ attachments: [file(1)] }));
    expect([missing.statusCode, missing.json().code]).toEqual([400, 'attachment_path']);
    expect(m.payments.insert).not.toHaveBeenCalled();
    expect(m.attachments.save).not.toHaveBeenCalled();
  });

  it('first bytes not an image / PDF → 400 attachment_type', async () => {
    m.storage.head.mockResolvedValue(new TextEncoder().encode('<html><body>x'));
    const res = await call(post({ attachments: [file(1)] }));
    expect([res.statusCode, res.json().code]).toEqual([400, 'attachment_type']);
    m.storage.head.mockResolvedValue(null);
    expect((await call(post({ attachments: [file(1)] }))).json().code).toBe('attachment_type');
    expect(m.payments.insert).not.toHaveBeenCalled();
  });

  it('a replayed form (same clientRequestId): no second payment, the same rows upserted on their path', async () => {
    const REQ = '7d1c6a52-3b7e-4f0e-9a51-2f7c3e9b8a10';
    m.payments.byRequest.mockResolvedValue(paymentRow({ client_request_id: REQ }));
    const res = await call(post({ attachments: [file(1)], clientRequestId: REQ }));
    expect([res.statusCode, res.json().id]).toEqual([201, PAYMENT_ID]);
    expect(m.payments.insert).not.toHaveBeenCalled();
    expect(m.attachments.save).toHaveBeenCalledWith([expect.objectContaining({ payment_id: PAYMENT_ID, path: file(1) })]);
  });

  it('the race loser saves the files on the winner (idempotent)', async () => {
    m.payments.insert.mockResolvedValue(null);
    m.payments.byRequest.mockResolvedValueOnce(null).mockResolvedValueOnce(paymentRow());
    const res = await call(post({ attachments: [file(1)], clientRequestId: '7d1c6a52-3b7e-4f0e-9a51-2f7c3e9b8a11' }));
    expect(res.statusCode).toBe(201);
    expect(m.attachments.save).toHaveBeenCalledWith([expect.objectContaining({ payment_id: PAYMENT_ID, path: file(1) })]);
  });
});
