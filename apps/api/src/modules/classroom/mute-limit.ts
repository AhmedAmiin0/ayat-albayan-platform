import { HttpException, HttpStatus } from '@nestjs/common';
import { WindowCounter } from '../feedback/feedback.rate-limit';

/** Mutes per staff login per 10 minutes: «كتم الجميع» in a full class is one call per student. */
export const MUTES_PER_WINDOW = 120;

/**
 * The mute routes' limit (in memory per API instance, as WindowCounter documents). Kick has no
 * such limit: it blocks the target for good, so it cannot be repeated against the same person.
 */
export class MuteLimit {
  private readonly perUser: WindowCounter;

  constructor(max = MUTES_PER_WINDOW) {
    this.perUser = new WindowCounter(max);
  }

  /** 429 too_many_requests when this login's bucket is full. */
  assert(userId: string, now = Date.now()): void {
    if (!this.perUser.allow(userId, now)) {
      throw new HttpException({ code: 'too_many_requests', message: 'too_many_requests' }, HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
