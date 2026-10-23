/**
 * Run `fn`; after a failure wait delays[i] and try again, so delays.length + 1 attempts in all.
 * The last error is rethrown; so is one `giveUp` accepts, at once (an outcome a retry cannot change).
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

export function sleep(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms));
}
