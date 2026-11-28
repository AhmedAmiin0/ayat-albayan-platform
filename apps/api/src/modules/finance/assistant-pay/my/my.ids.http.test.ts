import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { moneyApp, resetMocks, type Mocks } from '@/modules/finance/subscriptions/tests/test-app';

describe('the assistant’s own payment files: an id that is not a uuid', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => resetMocks(m));

  it('GET /sales/me/payments/not-a-uuid/attachments answers 400 validation_failed', async () => {
    const url = '/sales/me/payments/not-a-uuid/attachments';
    const res = await call({ method: 'GET', url, token: 'salesA' });
    expect([res.statusCode, res.json().code]).toEqual([400, 'validation_failed']);
    expect(m.payments.get).not.toHaveBeenCalled();
    expect(m.attachments.forPayment).not.toHaveBeenCalled();
  });
});
