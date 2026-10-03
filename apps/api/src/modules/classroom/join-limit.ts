import { HttpException, HttpStatus } from '@nestjs/common';
import { WindowCounter } from '../feedback/feedback.rate-limit';

/**
 * The public join route's limit, per 10 minutes: 10 requests per link and IP, 60 per IP (the same
 * numbers as the feedback form). In memory per API instance, as WindowCounter documents.
 */
export class PublicJoinLimit {
  private readonly perLink = new WindowCounter(10);
  private readonly perIp = new WindowCounter(60);

  /** 429 too_many_requests when either bucket is full. */
  assert(input: { ip: string; token: string }, now = Date.now()): void {
    const ok = this.perIp.allow(input.ip, now) && this.perLink.allow(`${input.ip}|${input.token}`, now);
    if (!ok) {
      throw new HttpException({ code: 'too_many_requests', message: 'too_many_requests' }, HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
