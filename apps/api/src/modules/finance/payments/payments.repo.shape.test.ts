import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { PaymentsRepo } from './payments.repo';

interface Call { table: string; method: string; args: unknown[] }
const argsAll = (calls: Call[], method: string) =>
  calls.filter((c) => c.method === method).map((c) => c.args);

const SELECT =
  '*, subscription:subscriptions!inner(student_id, currency, status, cancel_kind, student:students(id, code, name))';
const page = { page: 2, pageSize: 10 };

describe('PaymentsRepo.list shape', () => {
  it('counts exactly, applies every filter, pages by range, one trip', async () => {
    const { db, calls, trips } = fakeDb({ payments: [{ data: [{ id: 'p1' }], count: 11 }] });
    const f = { ...page, subscriptionId: 'u1', studentId: 's1', from: 'F', to: 'T' };
    const out = await new PaymentsRepo(db).list({ ...f, method: 'cash', kind: 'refund' });
    expect(out).toEqual({ items: [{ id: 'p1' }], total: 11, page: 2, pageSize: 10 });
    expect(argsAll(calls, 'select')).toEqual([[SELECT, { count: 'exact' }]]);
    expect(argsAll(calls, 'eq')).toEqual([
      ['subscription_id', 'u1'],
      ['subscription.student_id', 's1'],
      ['method', 'cash'],
      ['kind', 'refund'],
    ]);
    expect(argsAll(calls, 'gte')).toEqual([['paid_at', 'F']]);
    expect(argsAll(calls, 'lt')).toEqual([['paid_at', 'T']]);
    expect(argsAll(calls, 'range')).toEqual([[10, 19]]);
    expect(trips).toEqual(['payments']);
  });

  it('a null count is a total of 0', async () => {
    const { db } = fakeDb({ payments: [{ data: [] }] });
    expect((await new PaymentsRepo(db).list(page)).total).toBe(0);
  });
});

describe('PaymentsRepo.totals shape', () => {
  it('reads the narrow columns ordered by id in max_rows ranges, nets per currency', async () => {
    const rows = [
      { id: '1', amount: '100', currency: 'USD', kind: 'payment' },
      { id: '2', amount: 30, currency: 'USD', kind: 'refund' },
      { id: '3', amount: 50, currency: 'EGP', kind: 'payment' },
    ];
    const { db, calls, trips } = fakeDb({ payments: [{ data: rows }] });
    const out = await new PaymentsRepo(db).totals({ ...page, kind: 'payment' });
    expect(argsAll(calls, 'select')).toEqual([
      ['id, amount, currency, kind, subscription:subscriptions!inner(student_id)'],
    ]);
    expect(argsAll(calls, 'eq')).toEqual([['kind', 'payment']]);
    expect(argsAll(calls, 'order')).toEqual([['id']]);
    expect(argsAll(calls, 'range')).toEqual([[0, 999]]);
    expect(trips).toEqual(['payments']);
    expect(out).toEqual([
      { currency: 'EGP', net: 50, payments: 50, refunds: 0 },
      { currency: 'USD', net: 70, payments: 100, refunds: 30 },
    ]);
  });

  it('a full page asks for the next range', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => ({
      id: String(i), amount: 1, currency: 'USD', kind: 'payment',
    }));
    const { db, calls, trips } = fakeDb({ payments: [{ data: full }, { data: [] }] });
    const out = await new PaymentsRepo(db).totals(page);
    expect(argsAll(calls, 'range')).toEqual([[0, 999], [1000, 1999]]);
    expect(trips).toEqual(['payments', 'payments']);
    expect(out).toEqual([{ currency: 'USD', net: 1000, payments: 1000, refunds: 0 }]);
  });
});

describe('PaymentsRepo single-row reads', () => {
  it('netPaid: amount and kind of one package, payments minus refunds', async () => {
    const rows = [{ amount: '80', kind: 'payment' }, { amount: 20, kind: 'refund' }];
    const { db, calls, trips } = fakeDb({ payments: [{ data: rows }] });
    expect(await new PaymentsRepo(db).netPaid('u1')).toBe(60);
    expect(argsAll(calls, 'select')).toEqual([['amount, kind']]);
    expect(argsAll(calls, 'eq')).toEqual([['subscription_id', 'u1']]);
    expect(trips).toEqual(['payments']);
  });

  it.each([
    ['get', 'id', 'p1'],
    ['byRequest', 'client_request_id', 'r1'],
  ] as const)('%s: the full select on %s, maybeSingle, null passes through', async (m, col, v) => {
    const { db, calls, trips } = fakeDb({ payments: [{ data: null }] });
    expect(await new PaymentsRepo(db)[m](v)).toBeNull();
    expect(argsAll(calls, 'select')).toEqual([[SELECT]]);
    expect(argsAll(calls, 'eq')).toEqual([[col, v]]);
    expect(argsAll(calls, 'maybeSingle')).toEqual([[]]);
    expect(trips).toEqual(['payments']);
  });

  it('byInvoice: only the id of the payment recorded from the invoice', async () => {
    const { db, calls } = fakeDb({ payments: [{ data: { id: 'p1' } }] });
    expect(await new PaymentsRepo(db).byInvoice('i1')).toEqual({ id: 'p1' });
    expect(argsAll(calls, 'select')).toEqual([['id']]);
    expect(argsAll(calls, 'eq')).toEqual([['invoice_id', 'i1']]);
    expect(argsAll(calls, 'maybeSingle')).toEqual([[]]);
  });

  it('subscription: the package columns the checks need, from subscriptions', async () => {
    const sub = { id: 'u1', student_id: 's1', currency: 'USD', status: 'active', cancel_kind: null };
    const { db, calls, trips } = fakeDb({ subscriptions: [{ data: sub }] });
    expect(await new PaymentsRepo(db).subscription('u1')).toEqual(sub);
    expect(argsAll(calls, 'select')).toEqual([['id, student_id, currency, status, cancel_kind']]);
    expect(argsAll(calls, 'eq')).toEqual([['id', 'u1']]);
    expect(trips).toEqual(['subscriptions']);
  });

  it('recorders: distinct non-null ids in one in(), mapped id → full_name', async () => {
    const rows = [{ id: 'a1', full_name: 'سارة' }];
    const { db, calls, trips } = fakeDb({ profiles: [{ data: rows }] });
    const out = await new PaymentsRepo(db).recorders(['a1', null, 'a1', 'a2']);
    expect([...out]).toEqual([['a1', 'سارة']]);
    expect(argsAll(calls, 'select')).toEqual([['id, full_name']]);
    expect(argsAll(calls, 'in')).toEqual([['id', ['a1', 'a2']]]);
    expect(trips).toEqual(['profiles']);
  });

  it('recorders: no ids, no trip', async () => {
    const { db, trips } = fakeDb({});
    expect((await new PaymentsRepo(db).recorders([null])).size).toBe(0);
    expect(trips).toEqual([]);
  });
});
