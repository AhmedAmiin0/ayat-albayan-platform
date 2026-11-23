import { afterEach, describe, expect, it, vi } from 'vitest';
import { Ticker } from '@/common/jobs/ticker';
import { TickerJob } from './ticker-job';

class SlowJob extends TickerJob {
  finish: () => void = () => undefined;
  readonly run = vi.fn(
    () => new Promise<void>((r) => {
      this.finish = r;
    }),
  );

  protected readonly ticker = new Ticker({ name: 'slow', firstMs: 10, everyMs: 100, run: this.run });
}

describe('TickerJob (BE-14)', () => {
  afterEach(() => vi.useRealTimers());

  it('boot starts the timers; shutdown waits for the run in flight, then no timer runs', async () => {
    vi.useFakeTimers();
    const job = new SlowJob();
    job.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(10);
    expect(job.run).toHaveBeenCalledTimes(1);
    let down = false;
    const shutdown = job.beforeApplicationShutdown().then(() => {
      down = true;
    });
    await vi.advanceTimersByTimeAsync(1_000);
    expect(down).toBe(false);
    job.finish();
    await shutdown;
    expect(down).toBe(true);
    expect(job.run).toHaveBeenCalledTimes(1);
  });
});
