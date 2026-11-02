import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoursePauseJob } from './course-pause.job';
import type { CoursePauseRepo } from './course-pause.repo';
import type { CoursePauseService } from './course-pause.service';

const IDLE = { begun: 0, due: 0, resumed: 0, failed: 0 };

describe('CoursePauseJob timers (Ticker)', () => {
  afterEach(() => vi.useRealTimers());

  it('first runs 6 minutes after boot (not on boot), then hourly, and stops on shutdown', async () => {
    vi.useFakeTimers();
    const job = new CoursePauseJob({} as CoursePauseRepo, {} as CoursePauseService);
    const run = vi.spyOn(job, 'runOnce').mockResolvedValue(IDLE);
    job.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(6 * 60_000 - 1);
    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(run).toHaveBeenCalledTimes(2);
    job.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(5 * 3_600_000);
    expect(run).toHaveBeenCalledTimes(2);
  });
});
