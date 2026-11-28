import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { moneyApp, resetMocks, type Mocks } from '@/modules/finance/subscriptions/tests/test-app';

const ID_ROUTES = [
  ['POST', 'approve'],
  ['POST', 'reopen'],
  ['POST', 'unpay'],
  ['POST', 'pay'],
  ['GET', 'receipt'],
] as const;

describe('payouts routes: a payout id that is not a uuid', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => resetMocks(m));

  it.each(ID_ROUTES)('%s /payouts/:id/%s answers 400 validation_failed', async (method, action) => {
    const body = method === 'POST' ? { reason: 'paid twice' } : undefined;
    const res = await call({ method, url: `/payouts/not-a-uuid/${action}`, body });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('validation_failed');
    expect(m.payouts.get).not.toHaveBeenCalled();
  });
});
