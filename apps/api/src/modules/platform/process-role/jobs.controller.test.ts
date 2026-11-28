import type { ModuleRef } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { BackgroundJob } from '@/config/role/background-job';
import { ConfigReloadJob } from './config-reload.job';
import type { KickQuery } from '@/config/role/kick-options';
import { InternalJobsController } from './jobs.controller';
import { internalToken } from '@/config/role/worker-kick';
import { IS_PUBLIC, OWN_PUBLIC } from '@/common/auth/decorators';

const kickOf = (name: string, query: KickQuery = {}) => ({
  params: { name },
  query,
  body: undefined,
});

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
  const refs = {
    get: (token: unknown) => (token === ConfigReloadJob ? reload : job),
  } as unknown as ModuleRef;
  return { job, reload, controller: new InternalJobsController(refs) };
}

describe('POST /internal/jobs/:name/kick (the worker)', () => {
  it("with ?wait=1 runs the named job's kick and answers once its pass is done", async () => {
    const { job, controller } = route();
    await controller.kick(kickOf('test-kick-route', { wait: '1' }), internalToken());
    expect(job.kicked).toBe(1);
  });

  it('403 without the internal token, 404 for a job that cannot be kicked; nothing runs', async () => {
    const { job, controller } = route();
    const bare = controller.kick(kickOf('test-kick-route'), undefined);
    await expect(bare).rejects.toThrow('forbidden');
    const forged = controller.kick(kickOf('test-kick-route'), 'x'.repeat(43));
    await expect(forged).rejects.toThrow('forbidden');
    const unknown = controller.kick(kickOf('horizon'), internalToken());
    await expect(unknown).rejects.toThrow('not_found');
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

describe('internal job access', () => {
  const handlers = ['kick', 'peerReload'].map((n) =>
    Object(Reflect.get(InternalJobsController.prototype, n)),
  );

  it('is public through its route objects only: the internal token is the check', () => {
    expect(handlers.map((h) => Reflect.getOwnMetadata(IS_PUBLIC, h))).toEqual([true, true]);
    expect(handlers.map((h) => Reflect.getOwnMetadata(OWN_PUBLIC, h))).toEqual([
      undefined,
      undefined,
    ]);
  });
});
