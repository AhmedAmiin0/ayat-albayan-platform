import { afterEach, describe, expect, it, vi } from 'vitest';
import { BackgroundJob, backgroundJobs, kickable } from './background-job';
import { INTERNAL_HEADER, internalToken } from './worker-kick';

@BackgroundJob({ name: 'test-sender', kick: 'kick' })
class FakeJob {
  booted = 0;
  kicked = 0;
  onApplicationBootstrap(): void {
    this.booted += 1;
  }
  kick(): Promise<void> {
    this.kicked += 1;
    return Promise.resolve();
  }
}

function stubFetch(status = 204) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  vi.stubGlobal(
    'fetch',
    (url: string, init?: RequestInit) => (
      calls.push({ url, init }),
      Promise.resolve(new Response(null, { status }))
    ),
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('@BackgroundJob: the one role switch', () => {
  it('all (the default): the timers start and a kick runs here, as before', async () => {
    const job = new FakeJob();
    job.onApplicationBootstrap();
    await job.kick();
    expect([job.booted, job.kicked]).toEqual([1, 1]);
  });

  it('worker: the same', async () => {
    vi.stubEnv('APP_ROLE', 'worker');
    const job = new FakeJob();
    job.onApplicationBootstrap();
    await job.kick();
    expect([job.booted, job.kicked]).toEqual([1, 1]);
  });

  it('api: no timer starts, and a kick goes to the worker with the internal token (never runs here)', async () => {
    vi.stubEnv('APP_ROLE', 'api');
    vi.stubEnv('WORKER_URL', 'http://ayat-worker:3000/');
    const calls = stubFetch();
    const job = new FakeJob();
    job.onApplicationBootstrap();
    await job.kick();
    expect([job.booted, job.kicked]).toEqual([0, 0]);
    expect(calls.map((c) => [c.url, c.init?.method])).toEqual([
      ['http://ayat-worker:3000/internal/jobs/test-sender/kick', 'POST'],
    ]);
    expect(new Headers(calls[0]?.init?.headers).get(INTERNAL_HEADER)).toBe(internalToken());
  });

  it('api: a refused or missing worker never throws (its own poll picks the work up)', async () => {
    vi.stubEnv('APP_ROLE', 'api');
    const job = new FakeJob();
    await expect(job.kick()).resolves.toBeUndefined();
    vi.stubEnv('WORKER_URL', 'http://ayat-worker:3000');
    stubFetch(503);
    await expect(job.kick()).resolves.toBeUndefined();
    vi.stubGlobal('fetch', () => Promise.reject(new Error('ECONNREFUSED')));
    await expect(job.kick()).resolves.toBeUndefined();
    expect(job.kicked).toBe(0);
  });

  it('registers the kickable jobs by name, once', () => {
    expect(kickable('test-sender')).toEqual({ job: FakeJob, method: 'kick' });
    expect(kickable('nope')).toBeUndefined();
    expect([...backgroundJobs()]).toEqual([['test-sender', FakeJob]]);
    expect(() => BackgroundJob({ name: 'test-sender', kick: 'kick' })(FakeJob)).toThrow(
      'declared twice',
    );
    class NoKick {
      readonly kind = 'no hooks';
    }
    expect(() => BackgroundJob({ name: 'x' })(NoKick)).toThrow(
      'onApplicationBootstrap() is missing',
    );
    expect(backgroundJobs().has('x')).toBe(false);
  });
});
