import { describe, expect, it } from 'vitest';
import { expenseInsert, expensePatch } from './expense.write';

describe('expenseInsert', () => {
  it('takes the month sent, or the paid day’s month', () => {
    const base = { category: 'rent', amount: 5000, currency: 'EGP' };
    expect(expenseInsert({ ...base, month: '2026-09' }, 'a1')).toMatchObject({ month: '2026-09-01', paid_on: null, recurring: false });
    expect(expenseInsert({ ...base, paidOn: '2026-10-03', vendor: '  مكتب  ', recurring: true }, 'a1')).toMatchObject({
      month: '2026-10-01',
      paid_on: '2026-10-03',
      vendor: 'مكتب',
      recurring: true,
      created_by: 'a1',
    });
  });
});

describe('expensePatch', () => {
  it('writes only the sent fields; confirming a draft clears is_draft', () => {
    expect(expensePatch({ amount: 120, isDraft: false })).toEqual({ amount: 120, is_draft: false });
    expect(expensePatch({})).toEqual({});
  });

  it('a new paid day moves the month unless a month is sent; an empty vendor is null', () => {
    expect(expensePatch({ paidOn: '2026-11-02' })).toEqual({ paid_on: '2026-11-02', month: '2026-11-01' });
    expect(expensePatch({ paidOn: '2026-11-02', month: '2026-10' })).toEqual({ paid_on: '2026-11-02', month: '2026-10-01' });
    expect(expensePatch({ vendor: ' ' })).toEqual({ vendor: null });
  });
});
