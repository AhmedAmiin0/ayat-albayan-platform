import type { ModuleRef } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { BackgroundJob } from '@/config/role/background-job';
import { internalToken } from '@/config/role/worker-kick';
import { InternalJobsController } from './jobs.controller';

// docs/42 42-8: the kick answers 202 at once; `?wait=1` after the pass. `?lane=` reaches it.

@BackgroundJob({ name: 'test-kick-wait', kick: 'kick' })
class SlowJob {
  options: unknown[] = [];
  done = false;
  release: () => void = () => undefined;
  onApplicationBootstrap(): void {
    this.done = false;
  }
  kick(options: unknown): Promise<void> {
    this.options.push(options);
    return new Promise((resolve) => {
      this.release = () => {
        this.done = true;
        resolve();
      };
    });
  }
}

function route() {
  const job = new SlowJob();
  const refs = { get: () => job } as unknown as ModuleRef;
  return { job, controller: new InternalJobsController(refs) };
}

describe('POST /internal/jobs/:name/kick — 202 (docs/42 42-8)', () => {
  it('answers before the pass ends, with the lane passed on', async () => {
    const { job, controller } = route();
    await controller.kick('test-kick-wait', internalToken(), { lane: 'chat', wait: '0' });
    expect(job.done).toBe(false);
    expect(job.options).toEqual([{ lane: 'chat' }]);
    job.release();
  });

  it('no `wait` (an API copy from before 42-8, mid rolling deploy) answers after the pass', async () => {
    const { job, controller } = route();
    let answered = false;
    const res = controller.kick('test-kick-wait', internalToken()).then(() => {
      answered = true;
    });
    await Promise.resolve();
    expect(answered).toBe(false);
    job.release();
    await res;
    expect(answered).toBe(true);
  });

  it('?wait=1 answers once the pass is done', async () => {
    const { job, controller } = route();
    let answered = false;
    const res = controller.kick('test-kick-wait', internalToken(), { wait: '1' }).then(() => {
      answered = true;
    });
    await Promise.resolve();
    expect(answered).toBe(false);
    job.release();
    await res;
    expect(answered).toBe(true);
    expect(job.options).toEqual([{}]);
  });
});
