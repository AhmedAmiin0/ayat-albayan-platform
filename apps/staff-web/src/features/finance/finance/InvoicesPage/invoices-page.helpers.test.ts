import { describe, expect, it } from 'vitest';
import { filterValuesOf, isBare, pageSearch, paymentOf } from './invoices-page.helpers';

describe('invoices page helpers', () => {
  it('bare only with no rows, no range and no filter', () => {
    expect(isBare(0, {}, 0)).toBe(true);
    expect(isBare(0, { from: '2026-01-01' }, 0)).toBe(false);
    expect(isBare(0, { to: '2026-01-01' }, 0)).toBe(false);
    expect(isBare(0, {}, 1)).toBe(false);
    expect(isBare(3, {}, 0)).toBe(false);
    expect(isBare(undefined, {}, 0)).toBe(false);
  });

  it('filter values default to empty text', () => {
    expect(filterValuesOf({})).toEqual({ student: '', kind: '' });
    expect(filterValuesOf({ f_student: 'a', f_kind: 'makeup' })).toEqual({
      student: 'a',
      kind: 'makeup',
    });
  });

  it('the payment needs an invoice with a student', () => {
    const student = { id: 's1' };
    const invoice = { id: 'i1', students: [student] };
    expect(paymentOf(invoice)).toEqual({ invoiceId: 'i1', student });
    expect(paymentOf(null)).toBeNull();
    expect(paymentOf({ ...invoice, students: [] })).toBeNull();
  });

  it('page 1 drops the page from the URL', () => {
    expect(pageSearch(1)).toEqual({ page: undefined });
    expect(pageSearch(3)).toEqual({ page: 3 });
  });
});
