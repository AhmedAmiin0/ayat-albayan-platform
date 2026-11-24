import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { SELECT } from '@/modules/finance/subscriptions/list/subscriptions.list-query';
import { UsedBeforeEditRepo } from '@/modules/finance/subscriptions/used-before-edit/used-before-edit.repo';

const boom = { code: 'XX000', message: 'boom' };
const write = { id: 'sub1', from: 2, to: 5 };

describe('UsedBeforeEditRepo.courseBooked: a head count of the rules of the package', () => {
  it('counts schedule_rules ids of the subscription, any status, without rows', async () => {
    const { db, calls, trips } = fakeDb({ schedule_rules: [{ count: 2 }] });
    expect(await new UsedBeforeEditRepo(db).courseBooked('sub1')).toBe(true);
    expect(trips).toEqual(['schedule_rules']);
    expect(calls.map((c) => [c.method, ...c.args])).toEqual([
      ['select', 'id', { count: 'exact', head: true }],
      ['eq', 'subscription_id', 'sub1'],
    ]);
  });

  it('a zero or null count is false; a database error is thrown', async () => {
    const zero = fakeDb({ schedule_rules: [{ count: 0 }] });
    expect(await new UsedBeforeEditRepo(zero.db).courseBooked('sub1')).toBe(false);
    expect(await new UsedBeforeEditRepo(fakeDb({}).db).courseBooked('sub1')).toBe(false);
    const bad = fakeDb({ schedule_rules: [{ error: boom }] });
    await expect(new UsedBeforeEditRepo(bad.db).courseBooked('sub1')).rejects.toThrow('boom');
  });
});

describe('UsedBeforeEditRepo.setUsedBefore: a compare-and-set on lessons_used_before', () => {
  it('updates the number only while the read one is stored and the package is live', async () => {
    const sub = { id: 'sub1', lessons_used_before: 5, student: null };
    const { db, calls, trips } = fakeDb({ subscriptions: [{ data: sub }] });
    const out = await new UsedBeforeEditRepo(db).setUsedBefore(write);
    expect(trips).toEqual(['subscriptions']);
    expect(calls.map((c) => [c.method, ...c.args])).toEqual([
      ['update', { lessons_used_before: 5 }],
      ['eq', 'id', 'sub1'],
      ['eq', 'lessons_used_before', 2],
      ['neq', 'status', 'cancelled'],
      ['select', SELECT],
      ['maybeSingle'],
    ]);
    expect(out).toBe(sub);
  });

  it('no row matched is null; a database error is thrown', async () => {
    const none = fakeDb({ subscriptions: [{ data: null }] });
    expect(await new UsedBeforeEditRepo(none.db).setUsedBefore(write)).toBeNull();
    const bad = fakeDb({ subscriptions: [{ error: boom }] });
    await expect(new UsedBeforeEditRepo(bad.db).setUsedBefore(write)).rejects.toThrow(
      'db error XX000: boom',
    );
  });
});
