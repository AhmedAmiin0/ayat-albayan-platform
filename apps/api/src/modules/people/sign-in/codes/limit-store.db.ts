import { createHash } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { MemoryLimitStore, type LimitStore, type LimitTake } from './limit-store';

/** The bucket as stored: a digest, never a raw IP address or phone number. */
export const bucketDigest = (key: string): string =>
  createHash('sha256').update(key).digest('base64url');

/**
 * The sign-in buckets in Postgres (migration 931, rate_limit_take), so every API copy shares one budget.
 * An unreadable database falls back to this process's own buckets (logged): a limit still holds per copy,
 * and the sign-in itself needs the database anyway.
 */
@Injectable()
export class DbLimitStore implements LimitStore {
  private readonly log = new Logger(DbLimitStore.name);
  private readonly fallback = new MemoryLimitStore();

  constructor(@Inject(DB) private readonly db: Db) {}

  async take(input: LimitTake): Promise<boolean> {
    const { data, error } = await this.db.rpc('rate_limit_take', {
      p_buckets: input.buckets.map((b) => bucketDigest(b.key)),
      p_maxes: input.buckets.map((b) => b.max),
      p_window_ms: input.windowMs,
    });
    if (!error && typeof data === 'boolean') return data;
    this.log.warn(`sign-in limits counted in memory: ${error?.message ?? 'no answer'}`);
    return this.fallback.take(input);
  }
}
