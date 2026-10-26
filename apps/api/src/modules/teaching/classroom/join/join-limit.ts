import { HttpException, HttpStatus } from '@nestjs/common';
import { WindowCounter } from '../../feedback/public/feedback.rate-limit';

/**
 * The public join route's limit, per 10 minutes: 10 requests per link and IP, 60 per IP (the same
 * numbers as the feedback form). In memory per API instance, as WindowCounter documents.
 */
export class PublicJoinLimit {
  private readonly perLink = new WindowCounter(10);
  private readonly perIp = new WindowCounter(60);
  // Reads of the student's page (GET /public/student/:token) poll every 30 seconds: their own,
  // looser buckets (60 per link and IP, 240 per IP), so polling never uses up the join's budget.
  private readonly readsPerLink = new WindowCounter(60);
  private readonly readsPerIp = new WindowCounter(240);

  /** 429 too_many_requests when either bucket is full. */
  assert(input: { ip: string; token: string }, now = Date.now()): void {
    const ok = this.perIp.allow(input.ip, now) && this.perLink.allow(`${input.ip}|${input.token}`, now);
    if (!ok) {
      throw tooMany();
    }
  }

  /** 429 too_many_requests for a page read (not a join). */
  assertRead(input: { ip: string; token: string }, now = Date.now()): void {
    const ok = this.readsPerIp.allow(input.ip, now) && this.readsPerLink.allow(`${input.ip}|${input.token}`, now);
    if (!ok) throw tooMany();
  }
}

const tooMany = () => new HttpException({ code: 'too_many_requests', message: 'too_many_requests' }, HttpStatus.TOO_MANY_REQUESTS);
