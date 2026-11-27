import { describe, expect, it } from 'vitest';
import { expenseRoutes } from '../expenses.routes';

const ID = '00000000-0000-4000-8000-000000000001';
const expense = {
  id: ID,
  month: '2026-11',
  category: 'rent',
  amount: 1500,
  currency: 'EGP',
  note: null,
  created_at: '2026-11-02T10:00:00.000Z',
  paid_on: '2026-11-02',
  vendor: null,
  method: 'cash',
  has_receipt: false,
  recurring: true,
  is_draft: false,
};
const year = {
  year: '2026',
  currency: 'EGP',
  months: [{ month: '2026-01', total: 10, by_category: { rent: 10 } }],
  categories: ['rent'],
  total: 10,
  fx_missing: [],
  fx_date: null,
};

const line = (r: { method: string; path: string }) => `${r.method} ${r.path}`;

describe('expenseRoutes: expenses', () => {
  it('keeps the paths the api serves today', () => {
    const r = expenseRoutes;
    expect(
      [r.list, r.year, r.receiptUploadUrl, r.create, r.receipt, r.update, r.remove].map(line),
    ).toEqual([
      'GET /expenses',
      'GET /expenses/year',
      'POST /expenses/receipt-upload-url',
      'POST /expenses',
      'GET /expenses/:id/receipt',
      'PATCH /expenses/:id',
      'DELETE /expenses/:id',
    ]);
    expect(r.remove.response).toBe('empty');
  });

  it('answers expenses and the year table as the api builds them', () => {
    expect(expenseRoutes.list.response.parse([expense])).toEqual([expense]);
    expect(expenseRoutes.create.response.parse(expense)).toEqual(expense);
    expect(expenseRoutes.year.response.parse(year)).toEqual(year);
  });

  it('answers a category the admin added', () => {
    const added = { ...expense, category: 'fuel' };
    expect(expenseRoutes.update.response.parse(added)).toEqual(added);
  });

  it.each([
    ['a missing draft flag', { ...expense, is_draft: undefined }],
    ['an amount sent as text', { ...expense, amount: '1500' }],
    ['an unknown method', { ...expense, method: 'cheque' }],
    ['the card method', { ...expense, method: 'card' }],
  ])('refuses an expense with %s', (_name, answer) => {
    expect(expenseRoutes.create.response.safeParse(answer).success).toBe(false);
  });

  it('lists by month or by year, and the year table by year', () => {
    expect(expenseRoutes.list.query.parse({ month: '2026-11' })).toEqual({ month: '2026-11' });
    expect(expenseRoutes.list.query.parse({ year: '2026' })).toEqual({ year: '2026' });
    expect(expenseRoutes.year.query.parse({ year: '2026' })).toEqual({ year: '2026' });
    expect(expenseRoutes.year.query.safeParse({ year: '26' }).success).toBe(false);
  });

  it('creates in EGP by default and needs a month or a paid day', () => {
    const body = { category: 'rent', amount: 10, month: '2026-11' };
    expect(expenseRoutes.create.body.parse(body)).toEqual({ ...body, currency: 'EGP' });
    expect(expenseRoutes.create.body.safeParse({ category: 'rent', amount: 10 }).success).toBe(
      false,
    );
  });

  it('patches only what was sent, with no default currency', () => {
    expect(expenseRoutes.update.body.parse({ isDraft: false })).toEqual({ isDraft: false });
    expect(expenseRoutes.update.body.parse({ note: null })).toEqual({ note: null });
    expect(expenseRoutes.update.body.safeParse({ isDraft: true }).success).toBe(false);
  });

  it('takes a uuid for the expense id', () => {
    expect(expenseRoutes.receipt.params.safeParse({ id: 'x' }).success).toBe(false);
    expect(expenseRoutes.remove.params.parse({ id: ID })).toEqual({ id: ID });
  });
});
