import { afterEach, describe, expect, it, vi } from 'vitest';
import { BackgroundJob } from '@/config/role/background-job/background-job';

@BackgroundJob({ name: 'test-shutdown' })
class StoppingJob {
  stopped = 0;
  onApplicationBootstrap(): void {
    return undefined;
  }
  beforeApplicationShutdown(): Promise<void> {
    this.stopped += 1;
    return Promise.resolve();
  }
}

@BackgroundJob({ name: 'test-no-shutdown' })
class PlainJob {
  onApplicationBootstrap(): void {
    return undefined;
  }
}

afterEach(() => vi.unstubAllEnvs());

describe('@BackgroundJob: shutdown follows the role (BE-14)', () => {
  it('where jobs run, beforeApplicationShutdown runs the job’s own stop', async () => {
    vi.stubEnv('APP_ROLE', 'worker');
    const job = new StoppingJob();
    await job.beforeApplicationShutdown();
    expect(job.stopped).toBe(1);
  });

  it('api: the job never started, so its shutdown waits on nothing', async () => {
    vi.stubEnv('APP_ROLE', 'api');
    const job = new StoppingJob();
    await job.beforeApplicationShutdown();
    expect(job.stopped).toBe(0);
  });

  it('a job without the hook is still accepted', () => {
    expect(new PlainJob()).toBeInstanceOf(PlainJob);
  });
});
