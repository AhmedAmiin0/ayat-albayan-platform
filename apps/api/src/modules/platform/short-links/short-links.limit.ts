import { Injectable } from '@nestjs/common';
import { RateLimitRepo } from '@/common/http/rate-limit.repo';

/**
 * GET /r/:code's limit (like the payment page): 60 a minute per IP and 20 per IP and code,
 * shared by every API copy. 429 too_many_requests.
 */
@Injectable()
export class ShortLinksLimit {
  constructor(private readonly limits: RateLimitRepo) {}

  check(ip: string, code: string): Promise<void> {
    const buckets = [
      { key: `short-link:ip:${ip}`, max: 60 },
      { key: `short-link:code:${ip}|${code}`, max: 20 },
    ];
    return this.limits.takeOrThrow({ buckets, windowMs: 60_000 });
  }
}
