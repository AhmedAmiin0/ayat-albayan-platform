import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { RateLimitRepo } from '@/common/http/rate-limit.repo';

/** The CRM's own budget per key (docs/19 «crm»), so the script's batches pass as they did there. */
export const RELAY_PER_MINUTE = 120;

interface RelayRequest {
  ip: string;
}

/**
 * Both relay routes share one bucket per IP, counted before the key check so a wrong key cannot
 * make the CRM calls faster than the budget. 429 too_many_requests; the script retries a 429.
 */
@Injectable()
export class RelayLimit implements CanActivate {
  constructor(@Inject(RateLimitRepo) private readonly limits: RateLimitRepo) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const { ip } = ctx.switchToHttp().getRequest<RelayRequest>();
    const buckets = [{ key: `script-relay:ip:${ip}`, max: RELAY_PER_MINUTE }];
    await this.limits.takeOrThrow({ buckets, windowMs: 60_000 });
    return true;
  }
}
