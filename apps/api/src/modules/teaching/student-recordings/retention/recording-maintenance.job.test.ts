import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecordingMaintenanceJob } from './recording-maintenance.job';
import type { RecordingRetention } from './recording-retention';

const HOUR_MS = 3_600_000;

describe('RecordingMaintenanceJob timers (Ticker)', () => {
  afterEach(() => vi.useRealTimers());

  it('first runs 20 minutes after boot, then hourly; a tick during a slow run joins it', async () => {
    vi.useFakeTimers();
    const job = new RecordingMaintenanceJob({} as RecordingRetention);
    let finish = (): void => undefined;
    const slow = new Promise<{ stuck: number; purged: number }>((done) => {
      finish = () => done({ stuck: 0, purged: 0 });
    });
    const run = vi.spyOn(job, 'runOnce').mockReturnValue(slow);
    job.onApplicationBootstrap();
    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(20 * 60_000);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(HOUR_MS);
    expect(run).toHaveBeenCalledTimes(1);
    finish();
    await vi.advanceTimersByTimeAsync(HOUR_MS);
    expect(run).toHaveBeenCalledTimes(2);
    job.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(3 * HOUR_MS);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('runOnce never throws: a failing sweep counts 0 and the other still runs', async () => {
    const retention = {
      sweepStuck: vi.fn(async () => Promise.reject(new Error('db down'))),
      purgeExpired: vi.fn(async () => 3),
    };
    const job = new RecordingMaintenanceJob(retention as unknown as RecordingRetention);
    expect(await job.runOnce(new Date('2026-10-05T12:00:00Z'))).toEqual({ stuck: 0, purged: 3 });
  });
});
