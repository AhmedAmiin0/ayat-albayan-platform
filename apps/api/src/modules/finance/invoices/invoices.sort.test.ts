import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../people/guardians/fake-db';
import { invoiceRecentQuery, recentFilter } from './invoices.dto';
import { InvoicesQueries } from './invoices.queries';

const page = { page: 1, pageSize: 25 };
const on = (calls: { table: string; method: string; args: unknown[] }[], table: string, method: string) =>
  calls.filter((c) => c.table === table && c.method === method).map((c) => c.args);

describe('GET /invoices/recent sort + filters (R-NFR-08)', () => {
  it('no sort: newest first, then id', async () => {
    const { db, calls } = fakeDb({ invoices: [{ data: [], count: 0 }] });
    await new InvoicesQueries(db).recent(page);
    expect(on(calls, 'invoices', 'order')).toEqual([['created_at', { ascending: false }], ['id']]);
  });

  it('kind filter and kind sort', async () => {
    const { db, calls } = fakeDb({ invoices: [{ data: [], count: 0 }] });
    await new InvoicesQueries(db).recent({ ...page, kind: 'makeup', sort: 'kind' });
    expect(on(calls, 'invoices', 'eq')).toEqual([['kind', 'makeup']]);
    expect(on(calls, 'invoices', 'order')[0]).toEqual(['kind', { ascending: true }]);
  });

  it('student name: the matching bookings first, then only their invoices', async () => {
    const { db, calls } = fakeDb({
      schedule_rule_students: [{ data: [{ rule_id: 'r1' }, { rule_id: 'r1' }, { rule_id: 'r2' }] }],
      invoices: [{ data: [], count: 0 }],
    });
    await new InvoicesQueries(db).recent({ ...page, student: 'سهي_لة' });
    expect(on(calls, 'schedule_rule_students', 'ilike')).toEqual([['student.name', '%سهي\\_لة%']]);
    expect(on(calls, 'invoices', 'in')).toEqual([['rule_id', ['r1', 'r2']]]);
  });

  it('no booking matches the name → an empty page without reading invoices', async () => {
    const { db, calls } = fakeDb({ schedule_rule_students: [{ data: [] }] });
    expect(await new InvoicesQueries(db).recent({ ...page, student: 'لا أحد' })).toEqual({ rows: [], total: 0 });
    expect(calls.some((c) => c.table === 'invoices')).toBe(false);
  });

  it('schema: own allowlist (not the payments one); days become a UTC window', () => {
    expect(invoiceRecentQuery.safeParse({ sort: 'amount' }).success).toBe(false);
    expect(invoiceRecentQuery.safeParse({ kind: 'trial' }).success).toBe(false);
    const q = invoiceRecentQuery.parse({ from: '2026-09-01', to: '2026-09-30', sort: 'kind', dir: 'desc' });
    expect(recentFilter(q)).toEqual({
      ...page,
      sort: 'kind',
      dir: 'desc',
      from: '2026-08-31T21:00:00.000Z',
      to: '2026-09-30T21:00:00.000Z',
    });
  });
});
