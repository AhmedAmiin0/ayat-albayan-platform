import { identifierKey } from '@ab/shared';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { LIMIT_STORE, type LimitStore } from './limit-store';
import type { PhoneStats } from '../sign-in.ports';

const WINDOW_MS = 15 * 60_000;

/** docs/30 §3: per phone on file, counted in the database (login_codes). */
const PHONE_LIMITS = { per15Min: 3, perDay: 10, failedPerDay: 10 } as const;

/** May another code go to this phone now? Over a limit the request still answers 202 (no enumeration). */
export const phoneMaySend = (s: PhoneStats): boolean =>
  s.sentLast15Min < PHONE_LIMITS.per15Min && s.sentLastDay < PHONE_LIMITS.perDay && s.failedLastDay < PHONE_LIMITS.failedPerDay;

/**
 * The site-wide breaker (security review): wrong codes over EVERY phone in an hour. Past it no code is
 * sent or checked until the hour rolls on, so guessing across many families (sequential student codes)
 * stalls however many IPs it uses. ~25 times the busiest hour a real academy should see.
 */
export const GLOBAL_FAILED_PER_HOUR = 200;

/** May this phone's code still be checked? (10 wrong codes a day, across codes.) */
export const phoneMayCheck = (s: PhoneStats): boolean => s.failedLastDay < PHONE_LIMITS.failedPerDay;

type LimitKind = 'request' | 'check' | 'login';

const BUDGET: Record<LimitKind, { ip: number; identifier: number }> = {
  request: { ip: 20, identifier: 5 },
  check: { ip: 30, identifier: 10 },
  login: { ip: 30, identifier: 10 },
};

/**
 * The public sign-in routes' per-IP and per-identifier buckets (15 minutes). The identifier is folded
 * first (identifierKey: case, spaces, dashes, +), so `AB-1234` and `ab 1234` share one bucket. Counted
 * in the LimitStore: the database in the app (shared by every API copy, docs/09), memory in tests.
 */
@Injectable()
export class SignInLimits {
  constructor(@Inject(LIMIT_STORE) private readonly store: LimitStore) {}

  /** 429 too_many_requests when either bucket of this kind is full. */
  async assert(kind: LimitKind, at: { ip: string; identifier: string }, now = Date.now()): Promise<void> {
    const budget = BUDGET[kind];
    const buckets = [
      { key: `${kind}:ip:${at.ip}`, max: budget.ip },
      { key: `${kind}:id:${identifierKey(at.identifier)}`, max: budget.identifier },
    ];
    if (!(await this.store.take({ buckets, windowMs: WINDOW_MS, now }))) {
      throw new HttpException({ code: 'too_many_requests', message: 'too_many_requests' }, HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
