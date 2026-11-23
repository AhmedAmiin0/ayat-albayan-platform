import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { fakeDb } from '@/common/db/testing/fake-db';
import { RateLimitRepo } from './rate-limit.repo';

const TAKE = { buckets: [{ key: 'route:ip:1.1.1.1', max: 1 }], windowMs: 60_000 };
const repoOf = (db: unknown) => new RateLimitRepo(db as Db);

describe('RateLimitRepo.takeOrThrow', () => {
  it('429 when a bucket is full; buckets are digests, never the raw key', async () => {
    const { db, argsOf } = fakeDb({ 'rpc:rate_limit_take': [{ data: false }] });
    await expect(repoOf(db).takeOrThrow(TAKE)).rejects.toBeInstanceOf(HttpException);
    const [args] = argsOf('rpc:rate_limit_take', 'rpc') as [{ p_buckets: string[] }];
    expect(args.p_buckets[0]).not.toContain('1.1.1.1');
  });

  it('a test login (docs/56) is not counted: no database call at all', async () => {
    const { db, trips } = fakeDb({ 'rpc:rate_limit_take': [{ data: false }] });
    await expect(repoOf(db).takeOrThrow({ ...TAKE, userIsTest: true })).resolves.toBeUndefined();
    expect(trips).toEqual([]);
  });

  it('userIsTest false or absent counts as before', async () => {
    const { db, trips } = fakeDb({ 'rpc:rate_limit_take': [{ data: true }, { data: true }] });
    await repoOf(db).takeOrThrow({ ...TAKE, userIsTest: false });
    await repoOf(db).takeOrThrow(TAKE);
    expect(trips).toEqual(['rpc:rate_limit_take', 'rpc:rate_limit_take']);
  });
});
