/**
 * Run `fn`; after a failure wait delays[i] and try again, so delays.length + 1 attempts in all.
 * The last error is rethrown.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  opts: { delays: readonly number[]; sleep: (ms: number) => Promise<void> },
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn();
    } catch (e) {
      const delay = opts.delays[attempt];
      if (delay === undefined) throw e;
      await opts.sleep(delay);
    }
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms));
}
