import { afterEach, describe, expect, it, vi } from 'vitest';
import { LaneTickers } from './lane-tickers';

// Review of #695 (item 2): the chat lane has its own timer, so its retries never wait on main.

describe('LaneTickers', () => {
  afterEach(() => vi.useRealTimers());

  it('start() runs both lanes on their own timers (not kicked); stop() ends both', async () => {
    vi.useFakeTimers();
    const run = vi.fn(async () => undefined);
    const tickers = new LaneTickers('test', run);
    tickers.start({ firstMs: 10, everyMs: 100 });
    await vi.advanceTimersByTimeAsync(10);
    expect(run.mock.calls.map((c) => c.join(':')).sort()).toEqual(['chat:false', 'main:false']);
    await vi.advanceTimersByTimeAsync(100);
    expect(run).toHaveBeenCalledTimes(4);
    tickers.stop();
    await vi.advanceTimersByTimeAsync(500);
    expect(run).toHaveBeenCalledTimes(4);
  });

  it('a kick names its lane and marks the run kicked', async () => {
    const run = vi.fn(async () => undefined);
    await new LaneTickers('test', run).kick('chat');
    expect(run).toHaveBeenCalledExactlyOnceWith('chat', true);
  });
});
