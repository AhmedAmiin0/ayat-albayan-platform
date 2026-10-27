import { describe, expect, it } from 'vitest';
import type { Db } from '../../../../common/db/db.module';
import { bucketDigest, DbLimitStore } from './limit-store.db';

type Answer = { data: unknown; error: { message: string } | null };

function fakeDb(answer: Answer) {
  const calls: { fn: string; args: unknown }[] = [];
  const db = {
    rpc: (fn: string, args: unknown) => (calls.push({ fn, args }), Promise.resolve(answer)),
  };
  return { db: db as unknown as Db, calls };
}

const take = {
  buckets: [
    { key: 'request:ip:203.0.113.9', max: 20 },
    { key: 'request:id:966500000001', max: 5 },
  ],
  windowMs: 900_000,
  now: 0,
};

describe('DbLimitStore (migration 923, shared by every API copy)', () => {
  it('one rate_limit_take call: digests in order, their maxes, the window', async () => {
    const { db, calls } = fakeDb({ data: true, error: null });
    await expect(new DbLimitStore(db).take(take)).resolves.toBe(true);
    expect(calls).toEqual([
      {
        fn: 'rate_limit_take',
        args: {
          p_buckets: [
            bucketDigest('request:ip:203.0.113.9'),
            bucketDigest('request:id:966500000001'),
          ],
          p_maxes: [20, 5],
          p_window_ms: 900_000,
        },
      },
    ]);
  });

  it('never sends a raw IP address or phone number', async () => {
    const { db, calls } = fakeDb({ data: true, error: null });
    await new DbLimitStore(db).take(take);
    const sent = JSON.stringify(calls);
    expect(sent).not.toContain('203.0.113.9');
    expect(sent).not.toContain('966500000001');
    expect(bucketDigest('x')).toMatch(/^[\w-]{43}$/);
  });

  it('a full bucket in the database is a refusal', async () => {
    const { db } = fakeDb({ data: false, error: null });
    await expect(new DbLimitStore(db).take(take)).resolves.toBe(false);
  });

  it("an unreadable database falls back to this copy's own buckets (the limit still holds)", async () => {
    const { db } = fakeDb({ data: null, error: { message: 'function missing' } });
    const store = new DbLimitStore(db);
    const one = { buckets: [{ key: 'check:ip:a', max: 2 }], windowMs: 1000, now: 0 };
    expect([await store.take(one), await store.take(one), await store.take(one)]).toEqual([
      true,
      true,
      false,
    ]);
  });
});
