import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { EXPENSE_ID, expenseRow } from '../subscriptions/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';

describe('expenses routes (X1–X4, R-RPT-02)', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => resetMocks(m));

  it('X1: a month of expenses; a bad month is 400', async () => {
    m.expenses.forMonth.mockResolvedValue([expenseRow()]);
    const res = await call({ method: 'GET', url: '/expenses?month=2026-09' });
    expect(m.expenses.forMonth).toHaveBeenCalledWith('2026-09-01');
    expect(res.json()).toEqual([
      { id: EXPENSE_ID, month: '2026-09', category: 'ads', amount: 8000, currency: 'EGP', note: null, created_at: '2026-10-01T09:00:00Z' },
    ]);
    expect((await call({ method: 'GET', url: '/expenses?month=2026-9' })).statusCode).toBe(400);
  });

  it('X2: EGP by default, stored on the first of the month, audited', async () => {
    m.expenses.insert.mockResolvedValue(expenseRow());
    const res = await call({ method: 'POST', url: '/expenses', body: { month: '2026-09', category: 'ads', amount: 8000 } });
    expect(res.statusCode).toBe(201);
    expect(m.expenses.insert).toHaveBeenCalledWith(
      expect.objectContaining({ month: '2026-09-01', currency: 'EGP', amount: 8000, note: null }),
    );
    expect(m.audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'expenses', action: 'create' }));
  });

  it('X3: only the sent fields; 404 expense_not_found', async () => {
    m.expenses.get.mockResolvedValue(expenseRow());
    m.expenses.update.mockResolvedValue(expenseRow({ amount: 9000 }));
    const res = await call({ method: 'PATCH', url: `/expenses/${EXPENSE_ID}`, body: { amount: 9000 } });
    expect(res.json().amount).toBe(9000);
    expect(m.expenses.update).toHaveBeenCalledWith(EXPENSE_ID, { amount: 9000 });
    m.expenses.get.mockResolvedValue(null);
    const none = await call({ method: 'PATCH', url: `/expenses/${EXPENSE_ID}`, body: { amount: 1 } });
    expect(none.json().code).toBe('expense_not_found');
  });

  it('X4: delete is audited with the row; teachers are refused', async () => {
    m.expenses.get.mockResolvedValue(expenseRow());
    expect((await call({ method: 'DELETE', url: `/expenses/${EXPENSE_ID}` })).statusCode).toBe(204);
    expect(m.audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'delete', before: expenseRow() }));
    expect((await call({ method: 'GET', url: '/expenses?month=2026-09', token: 'teacher' })).statusCode).toBe(403);
  });
});
