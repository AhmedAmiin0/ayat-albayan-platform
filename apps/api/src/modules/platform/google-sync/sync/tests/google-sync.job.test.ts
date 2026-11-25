import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoogleSyncJob } from '@/modules/platform/google-sync/sync/google-sync.job';
import type { GoogleItemsQueries } from '@/modules/platform/google-sync/sync/google-items.queries';
import type { GoogleSyncProcessor } from '@/modules/platform/google-sync/sync/google-sync.processor';

const PASS = { claimed: 0, synced: 0, skipped: 0, gone: 0, failed: 0, retried: 0, stopped: false };
const DAY_MS = 86_400_000;

function world() {
  const processor = { runOnce: vi.fn(async () => PASS) };
  const items = { reconcile: vi.fn(async () => 3) };
  const job = new GoogleSyncJob(
    processor as unknown as GoogleSyncProcessor,
    items as unknown as GoogleItemsQueries,
  );
  return { job, processor, items };
}

function gate() {
  let open: () => void = () => undefined;
  const shut = new Promise<void>((done) => {
    open = done;
  });
  return { shut, open };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('GoogleSyncJob passes', () => {
  it('a kick during a pass shares it and queues exactly one more pass', async () => {
    const { job, processor } = world();
    const g = gate();
    processor.runOnce.mockImplementationOnce(async () => {
      await g.shut;
      return PASS;
    });
    const first = job.kick();
    const second = job.kick();
    g.open();
    await Promise.all([first, second]);
    expect(processor.runOnce).toHaveBeenCalledTimes(2);
  });

  it('loops while a pass was full, and stops looping once a pass was stopped', async () => {
    const { job, processor } = world();
    processor.runOnce
      .mockResolvedValueOnce({ ...PASS, claimed: 25 })
      .mockResolvedValueOnce({ ...PASS, claimed: 25, stopped: true });
    await job.kick();
    expect(processor.runOnce).toHaveBeenCalledTimes(2);
  });

  it('a failed pass is logged, never thrown, and the next kick runs again', async () => {
    const { job, processor } = world();
    processor.runOnce.mockRejectedValueOnce(new Error('down'));
    await expect(job.kick()).resolves.toBeUndefined();
    await job.kick();
    expect(processor.runOnce).toHaveBeenCalledTimes(2);
  });

  it('reconcile re-queues the window, then drains; a failure answers 0', async () => {
    const { job, processor, items } = world();
    expect(await job.reconcile()).toBe(3);
    await vi.waitFor(() => expect(processor.runOnce).toHaveBeenCalledTimes(1));
    items.reconcile.mockRejectedValueOnce(new Error('down'));
    expect(await job.reconcile()).toBe(0);
  });
});

describe('GoogleSyncJob timers', () => {
  it('first pass 45 s after boot, then every minute', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-25T03:00:00Z') });
    const { job, processor } = world();
    job.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(44_999);
    expect(processor.runOnce).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(processor.runOnce).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(processor.runOnce).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(processor.runOnce).toHaveBeenCalledTimes(3);
    await job.beforeApplicationShutdown();
  });

  it('GOOGLE_SYNC_POLL_MS sets the period and caps the first pass', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-25T03:00:00Z') });
    vi.stubEnv('GOOGLE_SYNC_POLL_MS', '1000');
    const { job, processor } = world();
    job.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(999);
    expect(processor.runOnce).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    const first = processor.runOnce.mock.calls.length;
    await vi.advanceTimersByTimeAsync(2_000);
    expect([first > 0, processor.runOnce.mock.calls.length - first]).toEqual([true, 2]);
    await job.beforeApplicationShutdown();
  });

  it('reconciles daily at 02:00 UTC', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-25T01:00:00Z') });
    const { job, items } = world();
    job.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(3_600_000 - 1);
    expect(items.reconcile).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(items.reconcile).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(DAY_MS);
    expect(items.reconcile).toHaveBeenCalledTimes(2);
    await job.beforeApplicationShutdown();
  });

  it('shutdown waits for the pass in flight and stops every timer', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-25T01:00:00Z') });
    const { job, processor, items } = world();
    const g = gate();
    processor.runOnce.mockImplementationOnce(async () => {
      await g.shut;
      return PASS;
    });
    job.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(45_000);
    let stopped = false;
    const stop = job.beforeApplicationShutdown().then(() => {
      stopped = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(stopped).toBe(false);
    g.open();
    await stop;
    await vi.advanceTimersByTimeAsync(2 * DAY_MS);
    expect(processor.runOnce).toHaveBeenCalledTimes(1);
    expect(items.reconcile).not.toHaveBeenCalled();
  });
});
