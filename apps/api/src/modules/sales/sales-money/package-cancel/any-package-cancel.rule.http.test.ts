import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SUB_ID, subRow } from '@/modules/finance/subscriptions/money/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '@/modules/finance/subscriptions/test-app';
import { salesDefaults } from '@/modules/sales/sales-money/sales-money.fakes';

// «اشتراط التعيين» ON (resetMocks' ENFORCED_SETTINGS, SalesOwnershipRule): the assistant cancels
// only her own students' packages; the system admin is never bound by the rule.

const url = `/sales/packages/${SUB_ID}/cancel`;
const cancelled = subRow({ status: 'cancelled' });

describe('/sales/packages/:id/cancel while the ownership rule is enforced', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
    m.subs.get.mockReset().mockResolvedValueOnce(subRow()).mockResolvedValue(cancelled);
    m.cancels.cancel.mockResolvedValue({ row: cancelled });
  });

  it('another assistant’s student → 403 not_your_student for GET and POST; nothing written', async () => {
    for (const method of ['GET', 'POST'] as const) {
      m.subs.get.mockResolvedValueOnce(subRow());
      const res = await call({ method, url, token: 'salesB' });
      expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_student']);
    }
    expect(m.cancels.linkedLessons).not.toHaveBeenCalled();
    expect(m.cancels.cancel).not.toHaveBeenCalled();
  });

  it('her own student → cancelled', async () => {
    const res = await call({ method: 'POST', url, token: 'salesA' });
    expect([res.statusCode, res.json()]).toEqual([200, { id: SUB_ID, status: 'cancelled' }]);
  });

  it('the system admin (subscriptions.stop) is never bound by the assistant rule', async () => {
    const res = await call({ method: 'POST', url, token: 'admin' });
    expect(res.statusCode).toBe(200);
    expect(m.sales.ownership).not.toHaveBeenCalled();
  });
});
