import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { RateLimitRepo } from '@/common/http/rate-limit.repo';

interface PageRequest {
  ip: string;
  params: { publicId?: string };
}

/**
 * Every public route of the report page, shared by every API copy: 60 a minute per IP and 20 per
 * IP and report. 429 too_many_requests. Buckets are digests, never a raw IP or id. The code steps
 * add the sign-in buckets (SignInLimits) and the per-phone limits on top.
 */
@Injectable()
export class ReportPublicLimit implements CanActivate {
  constructor(private readonly limits: RateLimitRepo) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<PageRequest>();
    const buckets = [
      { key: `report-page:ip:${req.ip}`, max: 60 },
      { key: `report-page:id:${req.ip}|${req.params.publicId ?? ''}`, max: 20 },
    ];
    await this.limits.takeOrThrow({ buckets, windowMs: 60_000 });
    return true;
  }
}
