import type { Settled, SettleOptions } from './outbox.types';

/** Then the row is parked: kept with its last error for an admin, never dropped. */
export const MAX_ATTEMPTS = 8;
const BASE_MS = 10_000;
const CAP_MS = 15 * 60_000;
const ERROR_MAX = 500;

/** 10 s, 20 s, 40 s… capped at 15 min, ±50 % jitter so a burst of failures spreads out. */
export function retryDelayMs(attempt: number, random: () => number = Math.random): number {
  const ms = Math.min(CAP_MS, BASE_MS * 2 ** Math.max(0, attempt - 1));
  return Math.round(ms * (0.5 + random()));
}

// jsonb refuses NUL and a lone surrogate, and one bad string fails finish_domain_events for the
// whole batch (no row finished, attempts never counted): the error is cleaned and cut whole.
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

function storable(error: string): string {
  const clean = error.replaceAll('\u0000', '').replace(LONE_SURROGATE, '\uFFFD');
  return clean.slice(0, ERROR_MAX).replace(LONE_SURROGATE, '');
}

const retryAt = (attempts: number, opts: SettleOptions): Date =>
  new Date(opts.now().getTime() + opts.delayMs(attempts));

/** A handler threw on this row's attempt `row.attempts + 1`. */
export function settleFailure(
  row: { id: string; attempts: number },
  error: string,
  opts: SettleOptions,
): Settled {
  const attempts = row.attempts + 1;
  const text = storable(error);
  return attempts >= opts.maxAttempts
    ? { id: row.id, state: 'parked', at: null, error: text }
    : { id: row.id, state: 'retry', at: retryAt(attempts, opts), error: text };
}

