/**
 * Run `fn`; after a failure wait delays[i] and try again, so delays.length + 1 attempts in all.
 * The last error is rethrown; so is one `giveUp` accepts, at once (an outcome a retry cannot change).
 * `sleep` is injected: @ab/shared has no timers (it also runs on Hermes), and tests skip the wait.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  opts: { delays: readonly number[]; sleep: (ms: number) => Promise<void>; giveUp?: (e: unknown) => boolean },
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn();
    } catch (e) {
      const delay = opts.delays[attempt];
      if (delay === undefined || opts.giveUp?.(e)) throw e;
      await opts.sleep(delay);
    }
  }
}

/** An exponential backoff curve: baseMs × factor^step, never above capMs. */
export interface BackoffCurve {
  baseMs: number;
  factor: number;
  capMs: number;
}

/** The wait at `step` (0 = the first retry) on `curve`; a negative step counts as 0. */
export function backoffDelay(step: number, curve: BackoffCurve): number {
  return Math.min(curve.capMs, curve.baseMs * curve.factor ** Math.max(0, step));
}

/** ±50 % jitter, rounded to the ms, so a burst of failures spreads out. random() is in [0, 1). */
export function withJitter(ms: number, random: () => number = Math.random): number {
  return Math.round(ms * (0.5 + random()));
}
