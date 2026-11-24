import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { PaymentLinksRepo } from '@/modules/finance/stripe/links/payment-links.repo';

type Calls = ReturnType<typeof fakeDb>['calls'];
const argsAll = (calls: Calls, method: string) =>
  calls.filter((c) => c.method === method).map((c) => c.args);

const SELECT = '*, student:students(id, code, name)';
const NOW = '2026-11-23T10:00:00.000Z';
const boom = { message: 'boom' };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
});
afterEach(() => {
  vi.useRealTimers();
});

describe('PaymentLinksRepo status changes: one update by id, read back', () => {
  it('cancel: only while open, the link back or null', async () => {
    const { db, calls, trips } = fakeDb({ payment_links: [{ data: { id: 'l1' } }, {}] });
    const repo = new PaymentLinksRepo(db);
    expect(await repo.cancel('l1')).toEqual({ id: 'l1' });
    expect(trips).toEqual(['payment_links']);
    expect(calls.map((c) => c.method)).toEqual(['update', 'eq', 'eq', 'select', 'maybeSingle']);
    expect(argsAll(calls, 'update')).toEqual([[{ status: 'cancelled', updated_at: NOW }]]);
    expect(argsAll(calls, 'eq')).toEqual([['id', 'l1'], ['status', 'open']]);
    expect(argsAll(calls, 'select')).toEqual([[SELECT]]);
    expect(await repo.cancel('l1')).toBeNull();
  });

  it('setProcessing: the flag and updated_at, no status guard', async () => {
    const { db, calls, trips } = fakeDb({ payment_links: [{}] });
    await new PaymentLinksRepo(db).setProcessing('l1', true);
    expect(trips).toEqual(['payment_links']);
    expect(argsAll(calls, 'update')).toEqual([[{ processing: true, updated_at: NOW }]]);
    expect(argsAll(calls, 'eq')).toEqual([['id', 'l1']]);
  });

  it('markPaid: paid, processing off, the payment and its intent', async () => {
    const { db, calls } = fakeDb({ payment_links: [{}] });
    const paid = { paymentId: 'p1', paidAt: NOW, paymentIntent: 'pi_1' };
    await new PaymentLinksRepo(db).markPaid('l1', paid);
    const patch = { status: 'paid', processing: false, paid_payment_id: 'p1', paid_at: NOW };
    const expected = { ...patch, stripe_payment_intent: 'pi_1', updated_at: NOW };
    expect(argsAll(calls, 'update')).toEqual([[expected]]);
    expect(argsAll(calls, 'eq')).toEqual([['id', 'l1']]);
  });

  it('markPaid without an intent leaves stripe_payment_intent untouched', async () => {
    const { db, calls } = fakeDb({ payment_links: [{}] });
    const paid = { paymentId: 'p1', paidAt: NOW, paymentIntent: null };
    await new PaymentLinksRepo(db).markPaid('l1', paid);
    expect(argsAll(calls, 'update')[0]?.[0]).not.toHaveProperty('stripe_payment_intent');
  });

  it('an update error is thrown as an «update» failure', async () => {
    const { db } = fakeDb({ payment_links: [{ error: boom }] });
    await expect(new PaymentLinksRepo(db).cancel('l1')).rejects.toThrow(
      'payment_links update failed: boom',
    );
  });
});

describe('PaymentLinksRepo.setSession: compare-and-set', () => {
  it('prev null: is null guard; true when a row changed', async () => {
    const { db, calls, trips } = fakeDb({ payment_links: [{ data: [{ id: 'l1' }] }] });
    const input = { id: 'l1', prev: null, session: 'cs_1' };
    expect(await new PaymentLinksRepo(db).setSession(input)).toBe(true);
    expect(trips).toEqual(['payment_links']);
    expect(argsAll(calls, 'update')).toEqual([[{ stripe_session_id: 'cs_1', updated_at: NOW }]]);
    expect(argsAll(calls, 'eq')).toEqual([['id', 'l1']]);
    expect(argsAll(calls, 'is')).toEqual([['stripe_session_id', null]]);
    expect(argsAll(calls, 'select')).toEqual([['id']]);
  });

  it('prev set: eq guard on it; false when another request changed it first', async () => {
    const { db, calls } = fakeDb({ payment_links: [{ data: [] }] });
    const input = { id: 'l1', prev: 'cs_0', session: null };
    expect(await new PaymentLinksRepo(db).setSession(input)).toBe(false);
    expect(argsAll(calls, 'eq')).toEqual([['id', 'l1'], ['stripe_session_id', 'cs_0']]);
    expect(argsAll(calls, 'is')).toEqual([]);
  });

  it('an error is a «session» failure', async () => {
    const { db } = fakeDb({ payment_links: [{ error: boom }] });
    const set = new PaymentLinksRepo(db).setSession({ id: 'l1', prev: null, session: 'cs' });
    await expect(set).rejects.toThrow('payment_links session failed: boom');
  });
});

describe('PaymentLinksRepo student and attribution', () => {
  it('student: brought_by and the priced, not cancelled packages', async () => {
    const subscriptions = [
      { id: 'a', price: 100, status: 'active' },
      { id: 'b', price: 0, status: 'active' },
      { id: 'c', price: 50, status: 'cancelled' },
    ];
    const data = { brought_by: 'u1', subscriptions };
    const { db, calls, trips } = fakeDb({ students: [{ data }, { data: null }] });
    const repo = new PaymentLinksRepo(db);
    expect(await repo.student('s1')).toEqual({ broughtBy: 'u1', priced: ['a'] });
    expect(trips).toEqual(['students']);
    expect(argsAll(calls, 'select')).toEqual([['brought_by, subscriptions(id, price, status)']]);
    expect(argsAll(calls, 'eq')).toEqual([['id', 's1']]);
    expect(argsAll(calls, 'maybeSingle')).toEqual([[]]);
    expect(await repo.student('s2')).toBeNull();
  });

  it('student error is thrown', async () => {
    const { db } = fakeDb({ students: [{ error: boom }] });
    await expect(new PaymentLinksRepo(db).student('s1')).rejects.toThrow('student failed: boom');
  });

  it('attribute: one rpc, the assistant as both assistant and actor', async () => {
    const fn = 'rpc:set_student_brought_by';
    const { db, calls, trips } = fakeDb({ [fn]: [{}, { error: boom }] });
    const repo = new PaymentLinksRepo(db);
    const input = { studentId: 's1', assistantId: 'u1', broughtAt: NOW };
    await repo.attribute(input);
    expect(trips).toEqual([fn]);
    const args = { p_student: 's1', p_assistant: 'u1', p_actor: 'u1', p_brought_at: NOW };
    expect(argsAll(calls, 'rpc')).toEqual([[args]]);
    await expect(repo.attribute(input)).rejects.toThrow('payment_links attribute failed: boom');
  });
});
