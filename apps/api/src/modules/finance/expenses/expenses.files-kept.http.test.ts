import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { EXPENSE_ID, expenseRow } from '@/modules/finance/subscriptions/money/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '@/modules/finance/subscriptions/test-app';

const OLD = 'expenses/old.pdf';
const NEW = 'expenses/new.pdf';

describe('expense receipts outlive their row (R-PAY-01, R-NFR-03)', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    m.expenses.get.mockResolvedValue(expenseRow({ receipt_path: OLD }));
    m.expenses.update.mockResolvedValue(expenseRow({ receipt_path: NEW }));
    m.storage.exists.mockResolvedValue(true);
  });

  it('delete removes the row and audits it, but leaves the receipt', async () => {
    expect((await call({ method: 'DELETE', url: `/expenses/${EXPENSE_ID}` })).statusCode).toBe(204);
    expect(m.expenses.remove).toHaveBeenCalledWith(EXPENSE_ID);
    const before = expect.objectContaining({ receipt_path: OLD });
    expect(m.audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'delete', before }));
    expect(m.storage.remove).not.toHaveBeenCalled();
  });

  it('a receipt replace keeps the old object; its path stays in the audit before row', async () => {
    const res = await call({ method: 'PATCH', url: `/expenses/${EXPENSE_ID}`, body: { receiptPath: NEW } });
    expect(res.statusCode).toBe(200);
    expect(m.expenses.update).toHaveBeenCalledWith(EXPENSE_ID, { receipt_path: NEW });
    const before = expect.objectContaining({ receipt_path: OLD });
    expect(m.audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'update', before }));
    expect(m.storage.remove).not.toHaveBeenCalled();
  });
});
