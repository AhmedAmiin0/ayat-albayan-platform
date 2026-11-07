import { afterEach, describe, expect, it, vi } from 'vitest';
import { BackgroundJob } from './background-job';
import { kickWorker } from './worker-kick';

// docs/42 42-7 / 42-8: on an API copy a kick's options (lane, wait) travel to the worker's route.

vi.mock('./worker-kick', () => ({ kickWorker: vi.fn(async () => undefined) }));

@BackgroundJob({ name: 'test-kick-options', kick: 'kick' })
class LanedJob {
  onApplicationBootstrap(): void {
    return undefined;
  }
  kick(options?: unknown): Promise<unknown> {
    return Promise.resolve(options);
  }
}

afterEach(() => vi.unstubAllEnvs());

describe('@BackgroundJob kick options', () => {
  it('an api process sends the lane and the wait to the worker', async () => {
    vi.stubEnv('APP_ROLE', 'api');
    await new LanedJob().kick({ lane: 'chat', wait: true });
    await new LanedJob().kick();
    expect(vi.mocked(kickWorker).mock.calls).toEqual([
      ['test-kick-options', { lane: 'chat', wait: true }],
      ['test-kick-options', {}],
    ]);
  });

  it('where jobs run, the local kick gets them as they are', async () => {
    vi.stubEnv('APP_ROLE', 'worker');
    await expect(new LanedJob().kick({ lane: 'chat' })).resolves.toEqual({ lane: 'chat' });
  });
});
