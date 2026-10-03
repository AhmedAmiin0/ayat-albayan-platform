import { HttpException, HttpStatus } from '@nestjs/common';

const WINDOW_MS = 10 * 60_000;
const SWEEP_AT = 10_000;

/**
 * Sliding-window counter. ponytail: in memory, per API instance. The hard guard against a double
 * answer is the unique row + `submitted_at is null` update; this only slows hammering. Move to a
 * DB or Redis counter if the API ever runs on more than one instance.
 */
export class WindowCounter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly max: number) {}

  allow(key: string, now: number): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return false;
    }
    this.hits.set(key, [...recent, now]);
    if (this.hits.size > SWEEP_AT) this.sweep(now);
    return true;
  }

  private sweep(now: number): void {
    for (const [key, times] of this.hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) this.hits.delete(key);
    }
  }
}

/** The public form's limit: 10 requests per token and IP, 60 per IP, each per 10 minutes. */
export class PublicFeedbackLimit {
  private readonly perToken = new WindowCounter(10);
  private readonly perIp = new WindowCounter(60);

  /** 429 too_many_requests when either bucket is full. */
  assert(input: { ip: string; token: string }, now = Date.now()): void {
    const ok = this.perIp.allow(input.ip, now) && this.perToken.allow(`${input.ip}|${input.token}`, now);
    if (!ok) {
      throw new HttpException(
        { code: 'too_many_requests', message: 'too_many_requests' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
