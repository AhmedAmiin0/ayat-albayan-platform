import { ServiceUnavailableException } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { EXPENSE_ID, expenseRow } from '../subscriptions/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';

// Expenses re-managed (owner, 2026-10-05): categories table, receipts, drafts, the year table.

describe('expenses v2 routes', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => resetMocks(m));

  it('create with the paid day, vendor, method and a checked receipt; amount errors are field errors', async () => {
    m.storage.exists.mockResolvedValue(true);
    m.expenses.insert.mockResolvedValue(expenseRow({ category: 'rent' }));
    const body = { category: 'rent', amount: 5000, paidOn: '2026-10-03', vendor: 'مكتب', method: 'bank', receiptPath: 'expenses/r.pdf', recurring: true };
    expect((await call({ method: 'POST', url: '/expenses', body })).statusCode).toBe(201);
    expect(m.expenses.insert).toHaveBeenCalledWith(expect.objectContaining({ month: '2026-10-01', receipt_path: 'expenses/r.pdf', recurring: true }));
    const bad = await call({ method: 'POST', url: '/expenses', body: { ...body, receiptPath: 'other/r.pdf' } });
    expect(bad.json().code).toBe('receipt_path');
    const amount = await call({ method: 'POST', url: '/expenses', body: { ...body, amount: 1.234 } });
    expect(amount.statusCode).toBe(400);
  });

  it('confirming a recurring draft is a PATCH isDraft:false, audited', async () => {
    m.expenses.get.mockResolvedValue(expenseRow({ is_draft: true }));
    m.expenses.update.mockResolvedValue(expenseRow());
    await call({ method: 'PATCH', url: `/expenses/${EXPENSE_ID}`, body: { isDraft: false } });
    expect(m.expenses.update).toHaveBeenCalledWith(EXPENSE_ID, { is_draft: false });
    expect(m.audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'expenses', action: 'update' }));
  });

  it('categories: list, add (409 when the key exists)', async () => {
    m.expenses.categories.mockResolvedValue([{ key: 'rent', label_ar: 'إيجار', label_en: 'Rent', active: true }]);
    expect((await call({ method: 'GET', url: '/expense-categories' })).json()).toHaveLength(1);
    m.expenses.addCategory.mockResolvedValue({ key: 'hosting', label_ar: 'استضافة', label_en: null, active: true });
    const ok = await call({ method: 'POST', url: '/expense-categories', body: { key: 'hosting', labelAr: 'استضافة' } });
    expect(ok.statusCode).toBe(201);
    m.expenses.addCategory.mockResolvedValue(null);
    const dup = await call({ method: 'POST', url: '/expense-categories', body: { key: 'hosting', labelAr: 'استضافة' } });
    expect(dup.json().code).toBe('category_exists');
    expect((await call({ method: 'POST', url: '/expense-categories', body: { key: 'Bad Key', labelAr: 'س' } })).statusCode).toBe(400);
  });

  it('the year table converts to the reporting currency and lists missing rates', async () => {
    m.expenses.between.mockResolvedValue([expenseRow({ amount: 1300 }), expenseRow({ currency: 'AED', amount: 5 })]);
    m.fx.rateSarTo.mockImplementation(async (quote: string) => {
      if (quote === 'AED') throw new ServiceUnavailableException({ code: 'fx_unavailable' });
      return { quote, rate: 13, date: '2026-10-01T00:00:00Z' };
    });
    const res = await call({ method: 'GET', url: '/expenses/year?year=2026' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ year: '2026', currency: 'SAR', total: 100, fx_missing: ['AED'] });
    expect((await call({ method: 'GET', url: '/expenses/year?year=26' })).statusCode).toBe(400);
  });

  it('receipt upload URL under receipts/expenses; teachers are refused', async () => {
    m.storage.signedUpload.mockResolvedValue({ bucket: 'receipts', path: 'expenses/x.png', token: 't', signed_url: 'u' });
    const res = await call({ method: 'POST', url: '/expenses/receipt-upload-url', body: { mime: 'image/png', size: 100 } });
    expect(res.json().path).toBe('expenses/x.png');
    expect((await call({ method: 'GET', url: '/expense-categories', token: 'teacher' })).statusCode).toBe(403);
  });
});
