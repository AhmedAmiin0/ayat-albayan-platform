import { SETTING_DEFAULTS } from '@ab/settings';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetMocks, type Mocks } from '@/modules/finance/subscriptions/tests/test-app';
import { salesMoneyApp } from '@/modules/sales/sales-money/tests/sales-money.test-app';
import { salesDefaults } from '@/modules/sales/sales-money/tests/sales-money.fakes';

const BAD = '/sales/packages/nope/cancel';

describe('/sales/packages/:id/cancel served from its route objects', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof salesMoneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await salesMoneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
    m.settings.all.mockResolvedValue(SETTING_DEFAULTS);
  });

  it('a malformed :id answers the validation_failed envelope; nothing read or written', async () => {
    for (const method of ['GET', 'POST'] as const) {
      const res = await call({ method, url: BAD, token: 'salesB', body: {} });
      expect([res.statusCode, res.json<{ message: string }>().message]).toEqual([
        400,
        'validation_failed',
      ]);
    }
    expect(m.subs.get).not.toHaveBeenCalled();
    expect(m.cancels.cancel).not.toHaveBeenCalled();
  });
});
