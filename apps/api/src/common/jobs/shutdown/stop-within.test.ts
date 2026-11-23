import { afterEach, describe, expect, it, vi } from 'vitest';
import { SHUTDOWN_BOUND_MS, stopWithin } from './stop-within';

const never = (): Promise<void> => new Promise<void>(() => undefined);

describe('stopWithin (BE-14: a stop bounded below Docker grace)', () => {
  afterEach(() => vi.useRealTimers());

  it('the bound is 20 s, below the 30 s stop_grace_period', () => {
    expect(SHUTDOWN_BOUND_MS).toBe(20_000);
  });

  it('settles when the stop settles, before the bound', async () => {
    const stop = vi.fn(async () => undefined);
    await expect(stopWithin({ stop })).resolves.toBe('stopped');
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('the 20 s bound wins over a hung pass', async () => {
    vi.useFakeTimers();
    let settled = false;
    const done = stopWithin({ stop: never }).then((how) => {
      settled = true;
      return how;
    });
    await vi.advanceTimersByTimeAsync(SHUTDOWN_BOUND_MS - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(done).resolves.toBe('timed-out');
  });

  it('a stop that rejects still settles the shutdown', async () => {
    const stop = vi.fn(async () => Promise.reject(new Error('boom')));
    await expect(stopWithin({ stop })).resolves.toBe('stopped');
  });

  it('leaves no timer behind once the stop settles', async () => {
    vi.useFakeTimers();
    await stopWithin({ stop: async () => undefined });
    expect(vi.getTimerCount()).toBe(0);
  });
});
