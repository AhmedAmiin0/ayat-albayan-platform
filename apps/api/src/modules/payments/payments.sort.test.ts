import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { paymentListQuery } from './payments.dto';
import { PaymentsQueries } from './payments.queries';

const page = { page: 1, pageSize: 25 };
const orders = (calls: { table: string; method: string; args: unknown[] }[]) =>
  calls.filter((c) => c.table === 'payments' && c.method === 'order').map((c) => c.args);

describe('GET /payments sort + filters (R-NFR-08)', () => {
  it('no sort: newest paid first, then id (stable pages)', async () => {
    const { db, calls } = fakeDb({ payments: [{ data: [], count: 0 }] });
    await new PaymentsQueries(db).list(page);
    expect(orders(calls)).toEqual([['paid_at', { ascending: false }], ['id']]);
  });

  it('a sort key orders by its column, then the default order and id', async () => {
    const { db, calls } = fakeDb({ payments: [{ data: [], count: 0 }] });
    await new PaymentsQueries(db).list({ ...page, sort: 'amount', dir: 'desc', method: 'cash' });
    expect(orders(calls)).toEqual([['amount', { ascending: false }], ['paid_at', { ascending: false }], ['id']]);
    expect(calls.filter((c) => c.method === 'eq').map((c) => c.args)).toEqual([['method', 'cash']]);
  });

  it('the query schema allowlists the keys and keeps the old params', () => {
    expect(paymentListQuery.parse({ sort: 'method', method: 'bank' })).toMatchObject({ sort: 'method', method: 'bank' });
    expect(paymentListQuery.safeParse({ sort: 'recorded_by' }).success).toBe(false);
    expect(paymentListQuery.safeParse({ dir: 'sideways' }).success).toBe(false);
  });
});
