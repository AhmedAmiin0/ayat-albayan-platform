import { afterEach, describe, expect, it, vi } from 'vitest';
import { Ticker } from './ticker';

function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('Ticker.kick (one more run after the current one)', () => {
  afterEach(() => vi.useRealTimers());

  it('kicks during a run queue exactly one more run, and share its promise', async () => {
    const gate = deferred();
    const run = vi.fn().mockReturnValueOnce(gate.promise).mockResolvedValue(undefined);
    const ticker = new Ticker({ name: 't', firstMs: 1, everyMs: 1, run });
    const first = ticker.kick();
    const second = ticker.kick();
    const third = ticker.kick();
    expect(second).toBe(first);
    expect(third).toBe(first);
    gate.resolve();
    await first;
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('an idle kick runs once; a tick during a run still only joins it', async () => {
    const run = vi.fn(async () => undefined);
    const ticker = new Ticker({ name: 't', firstMs: 1, everyMs: 1, run });
    await ticker.kick();
    expect(run).toHaveBeenCalledTimes(1);
    const a = ticker.tick();
    expect(ticker.tick()).toBe(a);
    await a;
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('a rejected run is logged and the queued run still goes', async () => {
    const run = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined);
    const ticker = new Ticker({ name: 't', firstMs: 1, everyMs: 1, run });
    const first = ticker.kick();
    void ticker.kick();
    await expect(first).resolves.toBeUndefined();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("timer 'kick': a timer firing during a run queues one more", async () => {
    vi.useFakeTimers();
    const gate = deferred();
    const run = vi.fn().mockReturnValueOnce(gate.promise).mockResolvedValue(undefined);
    const ticker = new Ticker({ name: 't', firstMs: 10, everyMs: 10, run, timer: 'kick' });
    ticker.start();
    await vi.advanceTimersByTimeAsync(10);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10);
    expect(run).toHaveBeenCalledTimes(1);
    gate.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(run).toHaveBeenCalledTimes(2);
    ticker.stop();
  });

  it('start(timing) replaces the options’ timing', async () => {
    vi.useFakeTimers();
    const run = vi.fn(async () => undefined);
    const ticker = new Ticker({ name: 't', firstMs: 30_000, everyMs: 30_000, run });
    ticker.start({ firstMs: 500, everyMs: 1_000 });
    await vi.advanceTimersByTimeAsync(500);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(500);
    expect(run).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(run).toHaveBeenCalledTimes(3);
    ticker.stop();
  });
});
