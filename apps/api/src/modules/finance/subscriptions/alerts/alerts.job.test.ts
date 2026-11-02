import { afterEach, describe, expect, it, vi } from 'vitest';
import { LessonEvents } from '@/common/infra/events/lesson-events';
import { AlertsJob } from './alerts.job';
import type { AlertsRepo } from './alerts.repo';
import type { SubscriptionAlertsService } from './alerts.service';

const SWEEP_MS = 15 * 60_000;

describe('AlertsJob sweep timers (Ticker)', () => {
  afterEach(() => vi.useRealTimers());

  it('sweeps 5 minutes after boot, then every 15 minutes, and stops on shutdown', async () => {
    vi.useFakeTimers();
    const alerts = {} as SubscriptionAlertsService;
    const job = new AlertsJob({} as AlertsRepo, alerts, new LessonEvents());
    const sweep = vi.spyOn(job, 'runOnce').mockResolvedValue({ students: 0, failed: 0 });
    job.onApplicationBootstrap();
    expect(sweep).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(sweep).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2 * SWEEP_MS);
    expect(sweep).toHaveBeenCalledTimes(3);
    job.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(4 * SWEEP_MS);
    expect(sweep).toHaveBeenCalledTimes(3);
  });
});
