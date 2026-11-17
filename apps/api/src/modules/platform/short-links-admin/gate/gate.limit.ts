import { Injectable, type CanActivate, type ExecutionContext, Inject } from '@nestjs/common';
import { RateLimitRepo } from '@/common/http/rate-limit.repo';

interface GateRequest {
  ip: string;
  params: { code?: string };
}

/**
 * Every public route of the short-link gate, shared by every API copy: 60 a minute per IP and 20
 * per IP and code (429 too_many_requests). The code steps add the sign-in buckets and the
 * per-phone limits on top (SHORT_LINK_CODES).
 */
@Injectable()
export class GateLimit implements CanActivate {
  constructor(@Inject(RateLimitRepo) private readonly limits: RateLimitRepo) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<GateRequest>();
    const buckets = [
      { key: `short-link-gate:ip:${req.ip}`, max: 60 },
      { key: `short-link-gate:code:${req.ip}|${req.params.code ?? ''}`, max: 20 },
    ];
    await this.limits.takeOrThrow({ buckets, windowMs: 60_000 });
    return true;
  }
}
