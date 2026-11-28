import { backoffDelay, withJitter } from '@ab/core';
import { GoogleApiError } from '@/modules/platform/google-sync/google-client.port';

/** Five attempts (docs/24 §3), then `failed` until an admin retries (lessons: the reconcile). */
export const MAX_ATTEMPTS = 5;
const BACKOFF = { baseMs: 30_000, factor: 2, capMs: 30 * 60_000 };

/** 30 s, 60 s, 2 min, 4 min… capped at 30 min, ±50 % jitter so a burst of 429s spreads out. */
export function retryDelayMs(attempt: number, random: () => number = Math.random): number {
  return withJitter(backoffDelay(attempt - 1, BACKOFF), random);
}

/**
 * What an error means for the item: `retry` (429, 5xx, network), `auth` (the refresh token is
 * dead: invalid_grant → disconnect, alert, stop the pass), `config` (any other 401, e.g. the token
 * endpoint's invalid_client after a wrong client secret: stop the pass, KEEP the refresh token),
 * `fatal` (anything else: failed).
 */
export type ErrorClass = 'retry' | 'auth' | 'config' | 'fatal';

type Test = (e: GoogleApiError) => boolean;

const RATE_LIMIT = /rateLimit|userRateLimit/i;
const BAD_CLIENT = new Set(['invalid_client', 'unauthorized_client']);

const deadToken: Test = (e) => e.reason === 'invalid_grant';
const badConfig: Test = (e) => e.status === 401 || BAD_CLIENT.has(e.reason);
const rateLimited: Test = (e) => e.status === 403 && RATE_LIMIT.test(e.reason);
const transient: Test = (e) => e.status === 429 || e.status >= 500 || rateLimited(e);

/** First match wins; a GoogleApiError no rule matches is `fatal`. */
const RULES: readonly (readonly [ErrorClass, Test])[] = [
  ['auth', deadToken],
  ['config', badConfig],
  ['retry', transient],
];

export function classify(e: unknown): ErrorClass {
  if (!(e instanceof GoogleApiError)) return 'retry';
  return RULES.find(([, test]) => test(e))?.[0] ?? 'fatal';
}

const plainText = (e: unknown): string => (e instanceof Error ? e.message : String(e));
const textOf = (e: unknown): string =>
  e instanceof GoogleApiError ? `${e.status} ${e.reason}` : plainText(e);

/** Never a token or a body: status and Google's reason only, ≤ 500 chars (the column check). */
export function errorText(e: unknown): string {
  return textOf(e)
    .replace(/(ya29|1\/\/)[A-Za-z0-9._-]+/g, '[redacted]')
    .slice(0, 500);
}
