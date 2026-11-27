import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetMocks, type Mocks } from '@/modules/finance/subscriptions/tests/test-app';
import { salesMoneyApp } from '@/modules/sales/sales-money/tests/sales-money.test-app';
import { PAY, salesDefaults } from './sales-money.fakes';

type Call = Awaited<ReturnType<typeof salesMoneyApp>>['call'];

const validationFailed = [400, 'validation_failed'];

describe('/sales/payments served from its route objects', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Call;

  beforeAll(async () => ({ app, m, call } = await salesMoneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
  });

  it('a transfer with a method of its own is a 400; nothing is inserted', async () => {
    const body = { ...PAY, method: 'cash' };
    const res = await call({ method: 'POST', url: '/sales/payments', token: 'salesA', body });
    expect(res.statusCode).toBe(400);
    expect(m.payments.insert).not.toHaveBeenCalled();
  });

  it('a chat copy without its message id answers the validation_failed envelope', async () => {
    const url = '/sales/payments/receipt-from-chat';
    const body = { subscriptionId: PAY.subscriptionId };
    const res = await call({ method: 'POST', url, token: 'salesA', body });
    const answer = res.json<{ message: string }>();
    expect([res.statusCode, answer.message]).toEqual(validationFailed);
  });

  it('a malformed :id answers the validation_failed envelope; no payment is read', async () => {
    const url = '/sales/payments/nope/amount';
    const res = await call({ method: 'PATCH', url, body: { amount: 10 } });
    const answer = res.json<{ message: string }>();
    expect([res.statusCode, answer.message]).toEqual(validationFailed);
    expect(m.payments.get).not.toHaveBeenCalled();
  });
});
