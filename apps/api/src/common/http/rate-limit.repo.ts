import { createHash } from 'node:crypto';
import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';

/** A bucket name as stored: a digest, never a raw IP. */
const digest = (key: string): string => createHash('sha256').update(key).digest('base64url');

interface PublicTake {
  /** Plain bucket keys (digested here) and each one's max in the window. */
  buckets: readonly { key: string; max: number }[];
  windowMs: number;
}

/**
 * rate_limit_take (migration 935) for the public routes, shared by every API copy: 429
 * too_many_requests when a bucket is full. An unreadable database lets the request through
 * (logged): the public page needs it anyway.
 */
@Injectable()
export class RateLimitRepo {
  private readonly log = new Logger(RateLimitRepo.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  async takeOrThrow(take: PublicTake): Promise<void> {
    const { data, error } = await this.db.rpc('rate_limit_take', {
      p_buckets: take.buckets.map((b) => digest(b.key)),
      p_maxes: take.buckets.map((b) => b.max),
      p_window_ms: take.windowMs,
    });
    if (error) {
      this.log.warn(`public limit not counted: ${error.message}`);
      return;
    }
    if (!data)
      throw new HttpException(
        { code: 'too_many_requests', message: 'too_many_requests' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
  }
}
