import { describe, expect, it, vi } from 'vitest';
import { Ticker } from './ticker';

function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('Ticker.stop() waits for the run in flight (BE-14)', () => {
  it('resolves at once when nothing runs', async () => {
    const ticker = new Ticker({ name: 't', firstMs: 1, run: vi.fn(async () => undefined) });
    await expect(ticker.stop()).resolves.toBeUndefined();
  });

  it('resolves only after the run in flight ends', async () => {
    const gate = deferred();
    const ticker = new Ticker({ name: 't', firstMs: 1, run: () => gate.promise });
    void ticker.tick();
    let stopped = false;
    const stop = ticker.stop().then(() => {
      stopped = true;
    });
    await Promise.resolve();
    expect(stopped).toBe(false);
    gate.resolve();
    await stop;
    expect(stopped).toBe(true);
  });

  it('a kick queued before stop() starts no further run', async () => {
    const gate = deferred();
    const run = vi.fn(() => gate.promise);
    const ticker = new Ticker({ name: 't', firstMs: 1, run });
    void ticker.tick();
    void ticker.kick();
    const stop = ticker.stop();
    gate.resolve();
    await stop;
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('after stop(), tick() and kick() start nothing', async () => {
    const run = vi.fn(async () => undefined);
    const ticker = new Ticker({ name: 't', firstMs: 1, run });
    await ticker.stop();
    await ticker.tick();
    await ticker.kick();
    expect(run).not.toHaveBeenCalled();
    expect(ticker.stopping).toBe(true);
  });
});
