import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { RateLimitRepo } from '@/common/http/rate-limit.repo';

/** The request parts the limit reads. */
interface LinkRequest {
  ip: string;
  params: { token?: string };
}

/**
 * The teacher report link's limit on every route of the link, shared by every API copy: 120 a
 * minute per IP and 60 per IP and link (the form autosaves while the teacher types). 429
 * too_many_requests. Buckets are digests, never a raw IP or token.
 */
@Injectable()
export class TeacherLinkLimit implements CanActivate {
  constructor(private readonly limits: RateLimitRepo) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<LinkRequest>();
    const token = req.params.token ?? '';
    const buckets = [
      { key: `teacher-link:ip:${req.ip}`, max: 120 },
      { key: `teacher-link:link:${req.ip}|${token}`, max: 60 },
    ];
    await this.limits.takeOrThrow({ buckets, windowMs: 60_000 });
    return true;
  }
}
