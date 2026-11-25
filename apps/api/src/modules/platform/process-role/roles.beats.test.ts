import { afterEach, describe, expect, it, vi } from 'vitest';
import { jobBeats } from '@/common/jobs/beats';
import { bootIn } from './roles.boot.probe';

/** Jobs with their own timers (not a Ticker, whose beats ticker.beats.test.ts covers). */
const OWN_TIMERS = ['ReportPdfJob', 'GoogleSyncJob', 'CrmMediaCopyJob'];

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('heartbeats on the real AppModule (docs/09 «Readiness»)', () => {
  it('api: no job registers a heartbeat (its jobs run in the worker)', async () => {
    const register = vi.spyOn(jobBeats, 'register');
    await bootIn('api');
    expect(register).not.toHaveBeenCalled();
  }, 60_000);

  it('worker: every interval job with its own timers registers one', async () => {
    const register = vi.spyOn(jobBeats, 'register');
    await bootIn('worker');
    const names = register.mock.calls.map(([plan]) => plan.name);
    expect(OWN_TIMERS.filter((n) => !names.includes(n))).toEqual([]);
  }, 60_000);
});
