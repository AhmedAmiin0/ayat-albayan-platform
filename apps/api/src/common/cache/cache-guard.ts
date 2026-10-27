import { Logger } from '@nestjs/common';

/** One warning a minute at most while the shared cache keeps failing. */
const LOG_EVERY_MS = 60_000;
/** The longest a cache call may take before the caller reads the database instead. */
const OP_TIMEOUT_MS = 500;
/** After a failure the cache is skipped this long (straight to the database), so a dead Redis costs nothing. */
export const SKIP_AFTER_FAILURE_MS = 5_000;

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

function withTimeout<T>(op: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`cache call timed out after ${ms} ms`)), ms);
    timer.unref();
  });
  return Promise.race([op, late]).finally(() => clearTimeout(timer));
}

/**
 * Runs every shared-cache call: a failure or a slow answer returns the fallback (a miss, so the caller
 * reads the database) and never throws; logs at most once a minute (the error text only, never a key's
 * value or the Redis URL), and skips the cache for SKIP_AFTER_FAILURE_MS after a failure.
 */
export class CacheGuard {
  errors = 0;
  private lastLog = Number.NEGATIVE_INFINITY;
  private skipUntil = 0;

  constructor(
    private readonly log: Pick<Logger, 'warn'> = new Logger('SharedCache'),
    private readonly now: () => number = Date.now,
  ) {}

  async run<T>(op: () => Promise<T>, fallback: T): Promise<T> {
    if (this.now() < this.skipUntil) return fallback;
    return this.attempt(op, fallback);
  }

  /** As run() but even inside the skip window: an invalidation is always tried (it must not be lost). */
  async attempt<T>(op: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await withTimeout(op(), OP_TIMEOUT_MS);
    } catch (e) {
      this.fail(e);
      return fallback;
    }
  }

  /** A failed call or a connection error (ioredis `error` events). */
  fail(e: unknown): void {
    this.errors += 1;
    const now = this.now();
    this.skipUntil = now + SKIP_AFTER_FAILURE_MS;
    if (now - this.lastLog < LOG_EVERY_MS) return;
    this.lastLog = now;
    this.log.warn(`shared cache unavailable, reading the database instead: ${messageOf(e)}`);
  }
}
