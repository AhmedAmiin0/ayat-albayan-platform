import { GoogleApiError } from './google-client.port';

/** Five attempts in all (docs/24 §3), then `failed` until an admin retries or the daily reconcile. */
export const MAX_ATTEMPTS = 5;
const BASE_MS = 30_000;
const CAP_MS = 30 * 60_000;

/** 30 s, 60 s, 2 min, 4 min… capped at 30 min, ±50 % jitter so a burst of 429s spreads out. */
export function retryDelayMs(attempt: number, random: () => number = Math.random): number {
  const exp = Math.min(CAP_MS, BASE_MS * 2 ** Math.max(0, attempt - 1));
  return Math.round(exp * (0.5 + random()));
}

/**
 * What an error means for the item: `retry` (429, 5xx, network), `auth` (the refresh token is
 * dead: invalid_grant / 401 → disconnect, alert, stop the pass), `fatal` (anything else: failed).
 */
export type ErrorClass = 'retry' | 'auth' | 'fatal';

export function classify(e: unknown): ErrorClass {
  if (!(e instanceof GoogleApiError)) return 'retry';
  if (e.reason === 'invalid_grant' || e.status === 401) return 'auth';
  if (e.status === 429 || e.status >= 500 || (e.status === 403 && /rateLimit|userRateLimit/i.test(e.reason))) return 'retry';
  return 'fatal';
}

/** Never a token or a body: status and Google's reason only, at most 500 chars (the column check). */
export function errorText(e: unknown): string {
  const text = e instanceof GoogleApiError ? `${e.status} ${e.reason}` : e instanceof Error ? e.message : String(e);
  return text.replace(/(ya29|1\/\/)[A-Za-z0-9._-]+/g, '[redacted]').slice(0, 500);
}
