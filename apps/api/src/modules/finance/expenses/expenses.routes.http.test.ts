import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { EXPENSE_ID, expenseRow } from '@/modules/finance/subscriptions/money/tests/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '@/modules/finance/subscriptions/tests/test-app';

describe('expenses routes: ids and declared answers (docs/62 C1)', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => resetMocks(m));

  it.each([
    ['GET', '/expenses/nope/receipt'],
    ['PATCH', '/expenses/nope'],
    ['DELETE', '/expenses/nope'],
  ] as const)('%s %s with a bad id → 400 validation_failed', async (method, url) => {
    const res = await call({ method, url, body: method === 'PATCH' ? { amount: 1 } : undefined });
    expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
    expect(res.json().issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'id' })]),
    );
  });

  it('PATCH sends only the fields it got, with no default currency', async () => {
    m.expenses.get.mockResolvedValue(expenseRow());
    m.expenses.update.mockResolvedValue(expenseRow({ is_draft: false }));
    const res = await call({
      method: 'PATCH',
      url: `/expenses/${EXPENSE_ID}`,
      body: { isDraft: false },
    });
    expect(res.statusCode).toBe(200);
    expect(m.expenses.update).toHaveBeenCalledWith(EXPENSE_ID, { is_draft: false });
  });

  it('GET /expenses answers each row as declared', async () => {
    m.expenses.between.mockResolvedValue([expenseRow()]);
    const res = await call({ method: 'GET', url: '/expenses?month=2026-09' });
    expect(res.statusCode).toBe(200);
    expect(Object.keys(res.json()[0]).sort()).toEqual(
      ['amount', 'category', 'created_at', 'currency', 'has_receipt', 'id', 'is_draft', 'method']
        .concat(['month', 'note', 'paid_on', 'recurring', 'vendor'])
        .sort(),
    );
  });
});
