import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MoneyWrites } from '../subscriptions/money/money-writes';
import { moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';
import { ADMIN_PAY, attachment as file, JPEG, PAYMENT_ID, paymentRow, STUDENT_ID, SUB_ID } from '../sales-money/sales-money.pay.fakes';

const REQ = '7d1c6a52-3b7e-4f0e-9a51-2f7c3e9b8a40';
const post = (body: object) => ({ method: 'POST' as const, url: '/payments', body: { ...ADMIN_PAY, clientRequestId: REQ, ...body } });

// Rule 8: two sends of the same form (same clientRequestId) book one payment, and neither gets an error.
describe('POST /payments: a retry racing the first send', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];
  let replayed: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    ({ app, m, call } = await moneyApp());
    replayed = vi.spyOn(app.get(MoneyWrites), 'replayed');
  });
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    replayed.mockClear();
    m.payments.subscription.mockResolvedValue({ id: SUB_ID, student_id: STUDENT_ID, currency: 'SAR' });
    m.payments.insert.mockResolvedValue(paymentRow());
    m.payments.get.mockResolvedValue(paymentRow());
    m.storage.info.mockResolvedValue({ size: 2048, contentType: 'image/jpeg' });
    m.storage.exists.mockResolvedValue(true);
    m.storage.head.mockResolvedValue(JPEG);
  });

  for (const [what, body] of [
    ['receipt', { receiptPath: file(1) }],
    ['attachments', { attachments: [file(1)] }],
  ] as const) {
    it(`its ${what} owned by the payment the first send just booked: 201 that payment, no insert`, async () => {
      m.payments.byRequest.mockResolvedValueOnce(null).mockResolvedValue(paymentRow({ client_request_id: REQ }));
      m.attachments.owners.mockResolvedValue([{ path: file(1), paymentId: PAYMENT_ID }]);
      const res = await call(post(body));
      expect([res.statusCode, res.json().id]).toEqual([201, PAYMENT_ID]);
      expect(m.payments.insert).not.toHaveBeenCalled();
      expect(replayed).toHaveBeenCalledWith(expect.objectContaining({ entityId: PAYMENT_ID }), STUDENT_ID);
    });
  }

  it('a file another payment holds, with no payment for this form: still 409 attachment_in_use', async () => {
    m.attachments.owners.mockResolvedValue([{ path: file(1), paymentId: PAYMENT_ID }]);
    const res = await call(post({ attachments: [file(1)] }));
    expect([res.statusCode, res.json().code]).toEqual([409, 'attachment_in_use']);
    expect(m.payments.byRequest).toHaveBeenCalledTimes(2);
  });

  it('the insert lost the race: the winner is replayed (follow-ups) and the form’s files saved on it', async () => {
    m.payments.insert.mockResolvedValue(null);
    m.payments.byRequest.mockResolvedValueOnce(null).mockResolvedValue(paymentRow({ client_request_id: REQ }));
    const res = await call(post({ attachments: [file(2)] }));
    expect([res.statusCode, res.json().id]).toEqual([201, PAYMENT_ID]);
    expect(replayed).toHaveBeenCalledWith(expect.objectContaining({ entityId: PAYMENT_ID, action: 'create' }), STUDENT_ID);
    expect(m.attachments.save).toHaveBeenCalledWith([expect.objectContaining({ payment_id: PAYMENT_ID, path: file(2) })]);
    expect(m.audit.record).not.toHaveBeenCalled();
  });

  it('the insert lost the race and the winner is gone: 404 payment_not_found', async () => {
    m.payments.insert.mockResolvedValue(null);
    const res = await call(post({}));
    expect([res.statusCode, res.json().code]).toEqual([404, 'payment_not_found']);
  });

  it('a failing follow-up after the insert cannot drop the form’s files: they are saved first', async () => {
    m.audit.record.mockRejectedValue(new Error('audit down'));
    await call(post({ attachments: [file(3)] }));
    expect(m.attachments.save).toHaveBeenCalledWith([expect.objectContaining({ payment_id: PAYMENT_ID, path: file(3) })]);
  });
});
