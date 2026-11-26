import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { SalesHistoryRepo } from '@/modules/sales/sales/history/sales-history.repo';

const subs = [{ id: 'a' }, { id: 'b' }];

describe('SalesHistoryQueries', () => {
  it('studentOf: the student id, or null for an unknown subscription', async () => {
    const f = fakeDb({ subscriptions: [{ data: { student_id: 's1' } }, { data: null }] });
    const q = new SalesHistoryRepo(f.db);
    expect(await q.studentOf('x')).toBe('s1');
    expect(await q.studentOf('y')).toBeNull();
  });

  it('history: whitelisted selects on subscriptions, payments and the audit json paths', async () => {
    const f = fakeDb({
      students: [{ data: { id: 's1', code: 'AB-1', name: 'x' } }],
      subscriptions: [{ data: subs }],
      v_subscription_balance: [{ data: [] }],
      payments: [{ data: [] }],
      audit_log: [{ data: [] }],
    });
    const out = await new SalesHistoryRepo(f.db).history('s1');
    expect(out?.subscriptions).toEqual(subs);
    expect(String(f.argsOf('subscriptions', 'select')?.[0])).not.toMatch(
      /price|currency|fx_|notes/,
    );
    expect(f.argsOf('payments', 'select')).toEqual([
      'id, subscription_id, paid_at, kind, amount, currency',
    ]);
    expect(f.argsOf('payments', 'in')).toEqual(['subscription_id', ['a', 'b']]);
    expect(f.argsOf('audit_log', 'select')).toEqual([
      'entity_id, at, before_status:before->>status, after_status:after->>status',
    ]);
    expect(f.argsOf('audit_log', 'eq')).toEqual(['entity', 'subscriptions']);
  });

  it('history: no student is null; no subscriptions reads nothing more', async () => {
    const none = fakeDb({ students: [{ data: null }], subscriptions: [{ data: [] }] });
    expect(await new SalesHistoryRepo(none.db).history('s1')).toBeNull();
    const empty = fakeDb({
      students: [{ data: { id: 's1', code: null, name: 'x' } }],
      subscriptions: [{ data: [] }],
    });
    expect((await new SalesHistoryRepo(empty.db).history('s1'))?.subscriptions).toEqual([]);
    expect(empty.calls.some((c) => c.table === 'payments')).toBe(false);
  });
});

describe('SalesHistoryRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate', async () => {
    const { db } = fakeDb({ subscriptions: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new SalesHistoryRepo(db).studentOf('x'))).toEqual({
      status: 409,
      body: { message: 'duplicate' },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ subscriptions: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new SalesHistoryRepo(db).studentOf('x'))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
