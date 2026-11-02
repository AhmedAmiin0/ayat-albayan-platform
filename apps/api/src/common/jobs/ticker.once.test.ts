import { afterEach, describe, expect, it, vi } from 'vitest';
import { Ticker } from './ticker';

describe('Ticker without everyMs (one run after boot)', () => {
  afterEach(() => vi.useRealTimers());

  it('runs once after firstMs and never again; stop() before it fires runs nothing', async () => {
    vi.useFakeTimers();
    const run = vi.fn(async () => undefined);
    const once = new Ticker({ name: 'once', firstMs: 5_000, run });
    once.start();
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(4_999);
    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(run).toHaveBeenCalledTimes(1);
    const stopped = new Ticker({ name: 'stopped', firstMs: 5_000, run });
    stopped.start();
    stopped.stop();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('start(timing) without everyMs drops the options’ interval', async () => {
    vi.useFakeTimers();
    const run = vi.fn(async () => undefined);
    new Ticker({ name: 't', firstMs: 1, everyMs: 10, run }).start({ firstMs: 1 });
    await vi.advanceTimersByTimeAsync(100);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
