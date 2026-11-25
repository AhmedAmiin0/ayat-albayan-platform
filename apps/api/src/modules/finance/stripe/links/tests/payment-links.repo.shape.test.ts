import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { PaymentLinksRepo } from '@/modules/finance/stripe/links/payment-links.repo';

type Calls = ReturnType<typeof fakeDb>['calls'];
const argsAll = (calls: Calls, method: string) =>
  calls.filter((c) => c.method === method).map((c) => c.args);

const SELECT = '*, student:students(id, code, name)';
const boom = { message: 'boom' };
const LINK = { id: 'l1', student: { id: 's1', code: 'AB-0001', name: 'سارة' } };

describe('PaymentLinksRepo.insert', () => {
  it('inserts the row and reads it back with its student, as a single row', async () => {
    const row = {
      amount: 100,
      client_request_id: 'r1',
      created_by: 'u1',
      currency: 'SAR',
      duration: 30,
      kind: 'renewal',
      lessons: 8,
      reference_price: 100,
      student_id: 's1',
      token: 't1',
    };
    const { db, calls, trips } = fakeDb({ payment_links: [{ data: LINK }] });
    expect(await new PaymentLinksRepo(db).insert(row)).toBe(LINK);
    expect(trips).toEqual(['payment_links']);
    expect(calls.map((c) => c.method)).toEqual(['insert', 'select', 'single']);
    expect(argsAll(calls, 'insert')).toEqual([[row]]);
    expect(argsAll(calls, 'select')).toEqual([[SELECT]]);
  });

  it('an insert error is thrown with what failed', async () => {
    const { db } = fakeDb({ payment_links: [{ error: boom }] });
    const insert = new PaymentLinksRepo(db).insert({
      amount: 1,
      client_request_id: 'r',
      created_by: 'u',
      currency: 'SAR',
      duration: 30,
      kind: 'renewal',
      lessons: 1,
      reference_price: 1,
      student_id: 's',
      token: 't',
    });
    await expect(insert).rejects.toThrow('payment_links insert failed: boom');
  });
});

type Finder = 'byRequest' | 'get' | 'byToken' | 'byPaymentIntent';
const FINDERS: [Finder, string][] = [
  ['byRequest', 'client_request_id'],
  ['get', 'id'],
  ['byToken', 'token'],
  ['byPaymentIntent', 'stripe_payment_intent'],
];

describe('PaymentLinksRepo single-link reads', () => {
  it.each(FINDERS)('%s: one maybeSingle read on %s', async (method, column) => {
    const { db, calls, trips } = fakeDb({ payment_links: [{ data: LINK }] });
    expect(await new PaymentLinksRepo(db)[method]('v1')).toBe(LINK);
    expect(trips).toEqual(['payment_links']);
    expect(calls.map((c) => c.method)).toEqual(['select', 'eq', 'maybeSingle']);
    expect(argsAll(calls, 'select')).toEqual([[SELECT]]);
    expect(argsAll(calls, 'eq')).toEqual([[column, 'v1']]);
  });

  it('none found is null; an error is a «read» failure', async () => {
    const { db } = fakeDb({ payment_links: [{ data: null }, { error: boom }] });
    const repo = new PaymentLinksRepo(db);
    expect(await repo.get('l1')).toBeNull();
    await expect(repo.byToken('t')).rejects.toThrow('payment_links read failed: boom');
  });
});

describe('PaymentLinksRepo lists', () => {
  it('list for a creator: newest first, at most 200, created_by = them', async () => {
    const { db, calls, trips } = fakeDb({ payment_links: [{ data: [LINK] }] });
    expect(await new PaymentLinksRepo(db).list({ createdBy: 'u1' })).toEqual([LINK]);
    expect(trips).toEqual(['payment_links']);
    expect(calls.map((c) => c.method)).toEqual(['select', 'order', 'limit', 'eq']);
    expect(argsAll(calls, 'select')).toEqual([[SELECT]]);
    expect(argsAll(calls, 'order')).toEqual([['created_at', { ascending: false }]]);
    expect(argsAll(calls, 'limit')).toEqual([[200]]);
    expect(argsAll(calls, 'eq')).toEqual([['created_by', 'u1']]);
  });

  it('list for an admin (createdBy null): no creator filter', async () => {
    const { db, calls } = fakeDb({ payment_links: [{ data: [] }] });
    await new PaymentLinksRepo(db).list({ createdBy: null });
    expect(argsAll(calls, 'eq')).toEqual([]);
  });

  it('list error is thrown', async () => {
    const { db } = fakeDb({ payment_links: [{ error: boom }] });
    const list = new PaymentLinksRepo(db).list({ createdBy: null });
    await expect(list).rejects.toThrow('payment_links list failed: boom');
  });

  it('forStudent: that student only, unbounded and unsorted', async () => {
    const { db, calls, trips } = fakeDb({ payment_links: [{ data: [LINK] }, { error: boom }] });
    const repo = new PaymentLinksRepo(db);
    expect(await repo.forStudent('s1')).toEqual([LINK]);
    expect(trips).toEqual(['payment_links']);
    expect(calls.map((c) => c.method)).toEqual(['select', 'eq']);
    expect(argsAll(calls, 'eq')).toEqual([['student_id', 's1']]);
    await expect(repo.forStudent('s1')).rejects.toThrow('payment_links student links failed');
  });
});
