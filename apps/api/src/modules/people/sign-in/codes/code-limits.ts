import { identifierKey } from '@ab/shared';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { WindowCounter } from '../../../teaching/feedback';
import type { PhoneStats } from '../sign-in.ports';

const WINDOW_MS = 15 * 60_000;

/** docs/30 §3: per phone on file, counted in the database (login_codes). */
export const PHONE_LIMITS = { per15Min: 3, perDay: 10, failedPerDay: 10 } as const;

/** May another code go to this phone now? Over a limit the request still answers 202 (no enumeration). */
export const phoneMaySend = (s: PhoneStats): boolean =>
  s.sentLast15Min < PHONE_LIMITS.per15Min && s.sentLastDay < PHONE_LIMITS.perDay && s.failedLastDay < PHONE_LIMITS.failedPerDay;

/** May this phone's code still be checked? (10 wrong codes a day, across codes.) */
export const phoneMayCheck = (s: PhoneStats): boolean => s.failedLastDay < PHONE_LIMITS.failedPerDay;

export type LimitKind = 'request' | 'check' | 'login';

const BUDGET: Record<LimitKind, { ip: number; identifier: number }> = {
  request: { ip: 20, identifier: 5 },
  check: { ip: 30, identifier: 10 },
  login: { ip: 30, identifier: 10 },
};

/**
 * The public sign-in routes' per-IP and per-identifier buckets (15 minutes). The identifier is folded
 * first (identifierKey: case, spaces, dashes, +), so `AB-1234` and `ab 1234` share one bucket. In memory
 * per API instance, like WindowCounter (docs/30 open item 2); the per-phone limits are in the database.
 */
@Injectable()
export class SignInLimits {
  private readonly counters = new Map<string, WindowCounter>();

  /** 429 too_many_requests when either bucket of this kind is full. */
  assert(kind: LimitKind, at: { ip: string; identifier: string }, now = Date.now()): void {
    const budget = BUDGET[kind];
    const ok =
      this.counter(`${kind}:ip`, budget.ip).allow(at.ip, now, WINDOW_MS) &&
      this.counter(`${kind}:id`, budget.identifier).allow(identifierKey(at.identifier), now, WINDOW_MS);
    if (!ok) throw new HttpException({ code: 'too_many_requests', message: 'too_many_requests' }, HttpStatus.TOO_MANY_REQUESTS);
  }

  private counter(name: string, max: number): WindowCounter {
    const found = this.counters.get(name);
    if (found) return found;
    const made = new WindowCounter(max);
    this.counters.set(name, made);
    return made;
  }
}
