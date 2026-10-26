import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../people/guardians/fake-db';
import { subscriptionListQuery } from './subscriptions.dto';
import { listSelect } from './subscriptions.list-query';
import { SubscriptionsQueries } from './subscriptions.queries';

const page = { page: 1, pageSize: 20 };
const on = (calls: { method: string; args: unknown[] }[], method: string) =>
  calls.filter((c) => c.method === method).map((c) => c.args);

describe('GET /subscriptions sort + filters (R-NFR-08)', () => {
  it('no sort: newest first, then id', async () => {
    const { db, calls } = fakeDb({ subscriptions: [{ data: [], count: 0 }] });
    await new SubscriptionsQueries(db).list(page);
    expect(on(calls, 'order')).toEqual([['created_at', { ascending: false }], ['id']]);
  });

  it('package sort puts a custom count last; package and name filters', async () => {
    const { db, calls } = fakeDb({ subscriptions: [{ data: [], count: 0 }] });
    await new SubscriptionsQueries(db).list({ ...page, sort: 'package', student: 'سهيلة', package: '8' });
    expect(on(calls, 'order')[0]).toEqual(['package', { ascending: true, nullsFirst: false }]);
    expect(on(calls, 'ilike')).toEqual([['student.name', '%سهيلة%']]);
    expect(on(calls, 'eq')).toEqual([['package', '8']]);
    expect(String(on(calls, 'select')[0]?.[0])).toContain('student:students!inner(');
  });

  it('the select embeds inner only for the name filter and «مدفوع جزئيًا»', () => {
    expect(listSelect({})).toBe('*, student:students(id, code, name)');
    expect(listSelect({ student: 'x', paid: 'partial' })).toBe(
      '*, student:students!inner(id, code, name), paid_rows:payments!inner(id)',
    );
  });

  it('schema: allowlisted keys; balance (derived) is not one', () => {
    expect(subscriptionListQuery.parse({ sort: 'price', dir: 'desc' })).toMatchObject({ sort: 'price', dir: 'desc' });
    expect(subscriptionListQuery.safeParse({ sort: 'balance' }).success).toBe(false);
    expect(subscriptionListQuery.safeParse({ package: 'huge' }).success).toBe(false);
  });
});
