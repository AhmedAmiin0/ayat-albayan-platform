import { afterEach, describe, expect, it, vi } from 'vitest';
import { jobBeats } from '@/common/jobs/beats';
import { bootIn } from './roles.boot.probe';

/** The interval jobs: each starts a Ticker, whose heartbeat ticker.beats.test.ts covers. */
const INTERVAL_JOBS = ['expenses', 'report-pdf', 'crm-media-copy', 'calls-sweeper', 'google-sync'];

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

  it('worker: every interval job beats through its Ticker', async () => {
    const probe = await bootIn('worker');
    expect(INTERVAL_JOBS.filter((n) => !probe.tickers.includes(n))).toEqual([]);
  }, 60_000);
});
