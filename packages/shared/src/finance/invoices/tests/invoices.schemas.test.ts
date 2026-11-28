import { describe, expect, it } from 'vitest';
import { invoiceListQuerySchema, invoiceRecentQuerySchema } from '../invoices.schemas';

const RULE = 'e1111111-1111-4111-8111-111111111111';
const STUDENT = 'e2222222-2222-4222-8222-222222222222';
const issues = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.error?.issues.map((i) => i.message) ?? [];

describe('invoiceListQuerySchema (GET /invoices)', () => {
  it('takes exactly one of ruleId and studentId', () => {
    expect(invoiceListQuerySchema.parse({ ruleId: RULE })).toEqual({ ruleId: RULE });
    expect(invoiceListQuerySchema.parse({ studentId: STUDENT })).toEqual({ studentId: STUDENT });
    expect(issues(invoiceListQuerySchema.safeParse({}))).toEqual(['rule_or_student']);
    const both = invoiceListQuerySchema.safeParse({ ruleId: RULE, studentId: STUDENT });
    expect(issues(both)).toEqual(['rule_or_student']);
  });

  it('rejects an id that is not a uuid', () => {
    expect(invoiceListQuerySchema.safeParse({ ruleId: 'nope' }).success).toBe(false);
  });
});

describe('invoiceRecentQuerySchema (GET /invoices/recent)', () => {
  it('defaults to the first page of 25, newest first', () => {
    expect(invoiceRecentQuerySchema.parse({})).toEqual({ page: 1, pageSize: 25 });
  });

  it('reads the query string: days, kind, a trimmed name, sort and paging', () => {
    const q = { from: '2026-01-01', to: '2026-01-31', kind: 'makeup', student: ' سهيلة ' };
    const paged = { ...q, sort: 'kind', dir: 'asc', page: '2', pageSize: '50' };
    expect(invoiceRecentQuerySchema.parse(paged)).toEqual({
      ...q,
      student: 'سهيلة',
      sort: 'kind',
      dir: 'asc',
      page: 2,
      pageSize: 50,
    });
  });

  it('rejects a range that ends before it starts, on `to`', () => {
    const r = invoiceRecentQuerySchema.safeParse({ from: '2026-02-01', to: '2026-01-01' });
    expect(r.error?.issues.map((i) => [i.path.join('.'), i.message])).toEqual([
      ['to', 'invalid_range'],
    ]);
  });

  it('rejects a trial kind, an empty name, an unknown sort and a page size over 100', () => {
    for (const bad of [{ kind: 'trial' }, { student: '  ' }, { sort: 'mime' }, { pageSize: 101 }]) {
      expect(invoiceRecentQuerySchema.safeParse(bad).success).toBe(false);
    }
  });
});
