import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../db/db.module';
import { ActivityRetentionJob } from './activity.retention.job';

const dbWith = (rpc: ReturnType<typeof vi.fn>) => ({ rpc }) as unknown as Db;

describe('ActivityRetentionJob (180 days)', () => {
  it('calls prune_activity_log and returns the rows deleted', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 7, error: null });
    expect(await new ActivityRetentionJob(dbWith(rpc)).runOnce()).toBe(7);
    expect(rpc).toHaveBeenCalledWith('prune_activity_log');
  });

  it('never throws on a DB error or a rejected call', async () => {
    const failing = vi.fn().mockResolvedValue({ data: null, error: { message: 'denied' } });
    expect(await new ActivityRetentionJob(dbWith(failing)).runOnce()).toBe(0);
    const rejecting = vi.fn().mockRejectedValue(new Error('down'));
    expect(await new ActivityRetentionJob(dbWith(rejecting)).runOnce()).toBe(0);
  });

  it('does not run on boot, and clears its timers on shutdown', () => {
    vi.useFakeTimers();
    const rpc = vi.fn().mockResolvedValue({ data: 0, error: null });
    const job = new ActivityRetentionJob(dbWith(rpc));
    job.onApplicationBootstrap();
    expect(rpc).not.toHaveBeenCalled();
    job.onModuleDestroy();
    vi.advanceTimersByTime(48 * 3_600_000);
    expect(rpc).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
