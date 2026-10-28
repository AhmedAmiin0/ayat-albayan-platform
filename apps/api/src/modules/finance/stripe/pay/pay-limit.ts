import { createHash } from 'node:crypto';
import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';

const WINDOW_MS = 60_000;
const digest = (key: string): string => createHash('sha256').update(key).digest('base64url');

/**
 * The public payment page's limit, shared by every API copy (rate_limit_take, migration 935): 30 requests a
 * minute per IP and 10 per IP and link. Buckets are digests, never a raw IP. An unreadable database lets the
 * request through (logged): the page needs the database anyway. 429 too_many_requests.
 */
@Injectable()
export class PayLimit {
  private readonly log = new Logger(PayLimit.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  async check(ip: string, token: string): Promise<void> {
    const { data, error } = await this.db.rpc('rate_limit_take', {
      p_buckets: [digest(`stripe-pay:ip:${ip}`), digest(`stripe-pay:link:${ip}|${token}`)],
      p_maxes: [30, 10],
      p_window_ms: WINDOW_MS,
    });
    if (error) {
      this.log.warn(`payment page limit not counted: ${error.message}`);
      return;
    }
    if (data === false) throw new HttpException({ code: 'too_many_requests', message: 'too_many_requests' }, HttpStatus.TOO_MANY_REQUESTS);
  }
}
