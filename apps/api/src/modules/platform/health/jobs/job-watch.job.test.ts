import { describe, expect, it, vi } from 'vitest';
import { BeatBook } from '@/common/jobs/beats';
import { JobWatchJob, WATCH_EVERY_MS, WATCH_FIRST_MS } from './job-watch.job';
import type { StaleAlerts } from './stale-alerts';

describe('JobWatchJob (the worker checks its own beats every minute)', () => {
  it('hands the book and the server clock to the alerts', async () => {
    const book = new BeatBook(() => 0);
    book.register({ name: 'a', everyMs: 1_000, firstMs: 0 });
    const check = vi.fn<StaleAlerts['check']>().mockResolvedValue(undefined);
    const job = new JobWatchJob({ check } as unknown as StaleAlerts, { book, now: () => 99 });
    await job.runOnce();
    expect(check).toHaveBeenCalledWith(book.list(), 99);
  });

  it('starts its ticker on boot (fake timers) and stops it on shutdown', async () => {
    vi.useFakeTimers();
    const check = vi.fn<StaleAlerts['check']>().mockResolvedValue(undefined);
    const source = { book: new BeatBook(), now: Date.now };
    const job = new JobWatchJob({ check } as unknown as StaleAlerts, source);
    job.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(WATCH_FIRST_MS + WATCH_EVERY_MS);
    expect(check).toHaveBeenCalledTimes(2);
    await job.beforeApplicationShutdown();
    await vi.advanceTimersByTimeAsync(WATCH_EVERY_MS * 2);
    expect(check).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
