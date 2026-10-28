import type { ModuleRef } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { BackgroundJob } from '../../../config/role/background-job';
import { ConfigReloadJob } from './config-reload.job';
import { InternalJobsController } from './jobs.controller';
import { internalToken } from '../../../config/role/worker-kick';

@BackgroundJob({ name: 'test-kick-route', kick: 'kick' })
class KickedJob {
  kicked = 0;
  onApplicationBootstrap(): void {}
  async kick(): Promise<void> {
    await Promise.resolve();
    this.kicked += 1;
  }
}

function route() {
  const job = new KickedJob();
  const reload = { reloadHere: vi.fn(async () => undefined) };
  const refs = { get: (token: unknown) => (token === ConfigReloadJob ? reload : job) } as unknown as ModuleRef;
  return { job, reload, controller: new InternalJobsController(refs) };
}

describe('POST /internal/jobs/:name/kick (the worker)', () => {
  it("runs the named job's kick and answers once its pass is done", async () => {
    const { job, controller } = route();
    await controller.kick('test-kick-route', internalToken());
    expect(job.kicked).toBe(1);
  });

  it('403 without the internal token, 404 for a job that cannot be kicked; nothing runs', async () => {
    const { job, controller } = route();
    await expect(controller.kick('test-kick-route', undefined)).rejects.toThrow('forbidden');
    await expect(controller.kick('test-kick-route', 'x'.repeat(43))).rejects.toThrow('forbidden');
    await expect(controller.kick('horizon', internalToken())).rejects.toThrow('not_found');
    expect(job.kicked).toBe(0);
  });
});

describe('POST /internal/jobs/config-reload/here (a peer API copy)', () => {
  it("reloads this process's config with the internal token; 403 without it", async () => {
    const { reload, controller } = route();
    await expect(controller.peerReload(undefined)).rejects.toThrow('forbidden');
    expect(reload.reloadHere).not.toHaveBeenCalled();
    await controller.peerReload(internalToken());
    expect(reload.reloadHere).toHaveBeenCalledTimes(1);
  });
});
