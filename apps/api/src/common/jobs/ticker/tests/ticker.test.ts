import { afterEach, describe, expect, it, vi } from 'vitest';
import { Ticker } from '@/common/jobs/ticker/ticker';

function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('Ticker (single flight, rule 8)', () => {
  afterEach(() => vi.useRealTimers());

  it('a tick during a run joins it instead of starting another', async () => {
    const gate = deferred();
    const run = vi.fn(() => gate.promise);
    const ticker = new Ticker({ name: 't', firstMs: 1, everyMs: 1, run });
    const a = ticker.tick();
    const b = ticker.tick();
    expect(run).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    gate.resolve();
    await a;
    await ticker.tick();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('a rejected run is logged, the next tick runs again', async () => {
    const run = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined);
    const ticker = new Ticker({ name: 't', firstMs: 1, everyMs: 1, run });
    await expect(ticker.tick()).resolves.toBeUndefined();
    await ticker.tick();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('runs first after firstMs, then every everyMs, until stopped', async () => {
    vi.useFakeTimers();
    const run = vi.fn(async () => undefined);
    const ticker = new Ticker({ name: 't', firstMs: 30_000, everyMs: 300_000, run });
    ticker.start();
    await vi.advanceTimersByTimeAsync(29_999);
    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(300_000);
    expect(run).toHaveBeenCalledTimes(2);
    await ticker.stop();
    await vi.advanceTimersByTimeAsync(900_000);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('with intervalFrom first, no interval tick comes before the first run', async () => {
    vi.useFakeTimers();
    const run = vi.fn(async () => undefined);
    const ticker = new Ticker({ name: 't', firstMs: 900_000, everyMs: 60_000, run });
    ticker.start({ firstMs: 900_000, everyMs: 60_000, intervalFrom: 'first' });
    await vi.advanceTimersByTimeAsync(899_999);
    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(180_000);
    expect(run).toHaveBeenCalledTimes(4);
    await ticker.stop();
    await vi.advanceTimersByTimeAsync(900_000);
    expect(run).toHaveBeenCalledTimes(4);
  });

  it('a stop before the first run leaves no interval behind', async () => {
    vi.useFakeTimers();
    const run = vi.fn(async () => undefined);
    const ticker = new Ticker({ name: 't', firstMs: 1_000, everyMs: 1_000, intervalFrom: 'first', run });
    ticker.start();
    await ticker.stop();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(run).not.toHaveBeenCalled();
  });
});
