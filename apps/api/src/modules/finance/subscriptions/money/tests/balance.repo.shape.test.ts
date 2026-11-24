import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { BalanceRepo } from '@/modules/finance/subscriptions/money/balance.repo';

const VIEW = 'v_subscription_balance';
const ids = (n: number, p: string) => Array.from({ length: n }, (_, i) => `${p}${String(i)}`);
const row = (sub: string | null, student: string | null, over: Record<string, unknown> = {}) => ({
  subscription_id: sub,
  student_id: student,
  lessons_total: 8,
  lessons_used: 3,
  remaining: 5,
  is_last: true,
  ended_at: null,
  projected_end_at: '2026-12-01T00:00:00.000Z',
  ...over,
});
const nulls = { lessons_total: null, lessons_used: null, remaining: null, is_last: null };
const zeroed = { lessons_total: 0, lessons_used: 0, remaining: 0, is_last: false };

describe('BalanceRepo.forSubscriptions: the view by subscription id, 100 ids per trip', () => {
  it('150 ids are two trips (100 + 50) on subscription_id, select *, keyed by subscription', async () => {
    const all = ids(150, 's');
    const { db, calls, trips } = fakeDb({
      [VIEW]: [{ data: [row('s0', 'st1')] }, { data: [row('s149', 'st2', nulls)] }],
    });
    const out = await new BalanceRepo(db).forSubscriptions(all);
    expect(trips).toEqual([VIEW, VIEW]);
    expect(calls.filter((c) => c.method === 'select').map((c) => c.args)).toEqual([['*'], ['*']]);
    const ins = calls.filter((c) => c.method === 'in').map((c) => c.args);
    expect(ins).toEqual([
      ['subscription_id', all.slice(0, 100)],
      ['subscription_id', all.slice(100)],
    ]);
    expect(calls.some((c) => ['order', 'limit', 'range', 'eq'].includes(c.method))).toBe(false);
    expect([...out.keys()]).toEqual(['s0', 's149']);
    expect(out.get('s0')).toEqual(row('s0', 'st1'));
    expect(out.get('s149')).toEqual(row('s149', 'st2', zeroed));
  });

  it('no ids: no trip at all, an empty map', async () => {
    const { db, trips } = fakeDb({});
    expect((await new BalanceRepo(db).forSubscriptions([])).size).toBe(0);
    expect(trips).toEqual([]);
  });

  it('rows with a null id are dropped; null data is an empty result', async () => {
    const { db } = fakeDb({ [VIEW]: [{ data: [row(null, 'st1'), row('s1', null)] }, {}] });
    expect((await new BalanceRepo(db).forSubscriptions(ids(101, 's'))).size).toBe(0);
  });

  it('a database error is thrown', async () => {
    const { db } = fakeDb({ [VIEW]: [{ error: { code: 'XX000', message: 'boom' } }] });
    await expect(new BalanceRepo(db).forSubscriptions(['s1'])).rejects.toThrow('db error XX000');
  });
});

describe('BalanceRepo.forStudents: the view by student id, 100 ids per trip', () => {
  it('filters on student_id per chunk and keeps the row order of the chunks', async () => {
    const all = ids(201, 'st');
    const { db, calls, trips } = fakeDb({
      [VIEW]: [
        { data: [row('s2', 'st0'), row('s1', 'st0')] },
        { data: [] },
        { data: [row('s3', 'st200')] },
      ],
    });
    const out = await new BalanceRepo(db).forStudents(all);
    expect(trips).toEqual([VIEW, VIEW, VIEW]);
    const ins = calls.filter((c) => c.method === 'in').map((c) => c.args);
    expect(ins).toEqual([
      ['student_id', all.slice(0, 100)],
      ['student_id', all.slice(100, 200)],
      ['student_id', ['st200']],
    ]);
    expect(out.map((r) => r.subscription_id)).toEqual(['s2', 's1', 's3']);
  });

  it('drops null-id rows and throws a database error of a later chunk', async () => {
    const ok = fakeDb({ [VIEW]: [{ data: [row(null, 'st0'), row('s1', 'st0')] }] });
    expect(await new BalanceRepo(ok.db).forStudents(['st0'])).toEqual([row('s1', 'st0')]);
    const bad = fakeDb({ [VIEW]: [{ data: [] }, { error: { message: 'boom' } }] });
    await expect(new BalanceRepo(bad.db).forStudents(ids(101, 'st'))).rejects.toThrow('boom');
  });
});
