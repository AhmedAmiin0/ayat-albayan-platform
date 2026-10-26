import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';
import { ADMIN_PAY, attachment as file, JPEG, PAYMENT_ID, paymentRow, STUDENT_ID, SUB_ID } from '../../sales/sales-money/sales-money.pay.fakes';

const REQ = '7d1c6a52-3b7e-4f0e-9a51-2f7c3e9b8a20';
const post = (body: object) => ({ method: 'POST' as const, url: '/payments', body: { ...ADMIN_PAY, clientRequestId: REQ, ...body } });
const stored = (...ns: number[]) => ns.map((n) => ({ id: `att-${n}`, path: file(n), mime: 'image/jpeg', size: 2048, created_at: '2026-10-12T09:00:00Z' }));
const savedPaths = (m: Mocks): string[] =>
  m.attachments.save.mock.calls.flatMap((args: unknown[]) => (args[0] as { path: string }[]).map((r) => r.path));

describe('POST /payments: a booked payment never comes back as an error (rule 8)', () => {
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

  it('a failing attachments save on the first POST: the audit row is written and the payment returned', async () => {
    m.attachments.save.mockRejectedValue(new Error('db down'));
    const res = await call(post({ attachments: [file(1)] }));
    expect([res.statusCode, res.json().id]).toEqual([201, PAYMENT_ID]);
    expect(m.audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'payments', action: 'create' }));
  });

  it('a lost-reply replay (every path already stored): 201 the same id, no storage I/O, nothing saved', async () => {
    m.payments.byRequest.mockResolvedValue(paymentRow({ client_request_id: REQ }));
    m.attachments.forPayment.mockResolvedValue(stored(1, 2));
    m.storage.info.mockResolvedValue(null); // would be a 400 if the replay re-checked it
    const res = await call(post({ attachments: [file(1), file(2)], receiptPath: file(9) }));
    expect([res.statusCode, res.json().id]).toEqual([201, PAYMENT_ID]);
    for (const fn of [m.storage.info, m.storage.head, m.storage.exists, m.attachments.save]) expect(fn).not.toHaveBeenCalled();
  });

  it('a replay that switches to bank on a cash row saves nothing', async () => {
    m.payments.byRequest.mockResolvedValue(paymentRow({ client_request_id: REQ, method: 'cash' }));
    m.payments.get.mockResolvedValue(paymentRow({ method: 'cash' }));
    const res = await call(post({ method: 'bank', attachments: [file(1)] }));
    expect([res.statusCode, res.json().id]).toEqual([201, PAYMENT_ID]);
    expect(m.attachments.save).not.toHaveBeenCalled();
    expect(m.storage.info).not.toHaveBeenCalled();
  });

  it('a replay: only the fresh paths, capped at 5 with the stored ones; a failing check is skipped, never a 400', async () => {
    m.payments.byRequest.mockResolvedValue(paymentRow({ client_request_id: REQ }));
    m.attachments.forPayment.mockResolvedValue(stored(1, 2, 3));
    m.storage.info.mockImplementation(async (ref: { path: string }) => (ref.path === file(4) ? null : { size: 2048 }));
    const res = await call(post({ attachments: [file(1), file(4), file(5), file(6)] }));
    expect([res.statusCode, res.json().id]).toEqual([201, PAYMENT_ID]);
    expect(savedPaths(m)).toEqual([file(5)]); // 4 failed its check, 6 is over the limit
  });

  it('a replay whose late save fails still answers 201 with the booked payment', async () => {
    m.payments.byRequest.mockResolvedValue(paymentRow({ client_request_id: REQ }));
    m.attachments.save.mockRejectedValue(new Error('db down'));
    const res = await call(post({ attachments: [file(1)] }));
    expect([res.statusCode, res.json().id]).toEqual([201, PAYMENT_ID]);
    expect(m.attachments.save).toHaveBeenCalledTimes(1);
  });

  it('the race loser on a cash winner saves nothing and still answers the winner', async () => {
    m.payments.insert.mockResolvedValue(null);
    m.payments.byRequest.mockResolvedValueOnce(null).mockResolvedValueOnce(paymentRow({ method: 'cash' }));
    m.payments.get.mockResolvedValue(paymentRow({ method: 'cash' }));
    const res = await call(post({ attachments: [file(1)] }));
    expect([res.statusCode, res.json().id]).toEqual([201, PAYMENT_ID]);
    expect(m.attachments.save).not.toHaveBeenCalled();
  });
});
