import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { STUDENT_ID } from '@/modules/finance/subscriptions/money/tests/money.fakes';
import { resetMocks, type Mocks } from '@/modules/finance/subscriptions/tests/test-app';
import { salesMoneyApp } from '@/modules/sales/sales-money/tests/sales-money.test-app';
import { salesDefaults } from '@/modules/sales/sales-money/tests/sales-money.fakes';
import { SalesTeacherAssign } from '@/modules/sales/sales-money/teacher';

type Call = Awaited<ReturnType<typeof salesMoneyApp>>['call'];

describe('/sales/subscriptions served from its route objects', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Call;

  beforeAll(async () => ({ app, m, call } = await salesMoneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
  });

  it('a teacher row whose id is not a uuid is a 500 response_invalid, never sent', async () => {
    const options = vi.spyOn(app.get(SalesTeacherAssign), 'options');
    options.mockResolvedValueOnce([{ id: 'not-a-uuid', name: 'أبرار' }]);
    const res = await call({ method: 'GET', url: '/sales/subscriptions/teachers', token: 'salesA' });
    expect([res.statusCode, res.json()]).toEqual([
      500,
      expect.objectContaining({ code: 'response_invalid' }),
    ]);
  });

  it('a quote with a typed price is a 400 before anything is priced', async () => {
    const body = { studentId: STUDENT_ID, pricing: { tier: 'weekly' }, price: 10 };
    const res = await call({ method: 'POST', url: '/sales/subscriptions/quote', token: 'salesA', body });
    expect(res.statusCode).toBe(400);
    expect(m.pricing.quote).not.toHaveBeenCalled();
  });

  it('a malformed :id answers the validation_failed envelope; nothing read or written', async () => {
    const url = '/sales/subscriptions/nope/cancel';
    const res = await call({ method: 'POST', url, token: 'salesA', body: {} });
    expect([res.statusCode, res.json<{ message: string }>().message]).toEqual([
      400,
      'validation_failed',
    ]);
    expect(m.subs.get).not.toHaveBeenCalled();
    expect(m.cancels.cancel).not.toHaveBeenCalled();
  });
});
