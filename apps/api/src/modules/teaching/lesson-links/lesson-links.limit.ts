import { Injectable } from '@nestjs/common';
import { RateLimitRepo } from '@/common/http/rate-limit.repo';

/** Which public route: GET /join/:token or GET /report-link/legacy/*. */
type LinkRoute = 'join' | 'legacy';

/**
 * The limit of the teacher's public link routes (like GET /r/:code): 60 a minute per IP and route,
 * 20 per IP and link, shared by every API copy. 429 too_many_requests. Buckets are digests.
 */
@Injectable()
export class LessonLinksLimit {
  constructor(private readonly limits: RateLimitRepo) {}

  check(route: LinkRoute, req: { ip: string; link: string }): Promise<void> {
    const buckets = [
      { key: `teacher-${route}:ip:${req.ip}`, max: 60 },
      { key: `teacher-${route}:link:${req.ip}|${req.link}`, max: 20 },
    ];
    return this.limits.takeOrThrow({ buckets, windowMs: 60_000 });
  }
}
