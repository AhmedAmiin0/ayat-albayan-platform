import { afterEach, describe, expect, it, vi } from 'vitest';
import { backgroundJobs } from '@/config/role/background-job';
import { bootIn } from './roles.boot.probe';

/**
 * The only timers an `api` copy may start (docs/09 «Two API copies + one worker»): per-process caches
 * and buffers, never a pass over shared rows. Anything else that starts a timer must be a @BackgroundJob.
 */
const PER_COPY: Record<string, string> = {
  'common/configuration/integrations/integration-config.service.ts':
    'refreshes its own copy of the saved integration keys',
  'modules/messaging/numbers/config/numbers.config.ts':
    'refreshes its own copy of the numbers overlay',
  'modules/platform/translations/translations.service.ts':
    'refreshes its own copy of the UI strings',
  'common/telemetry/client-usage/client-usage.service.ts': 'logs this copy’s own client-version counters',
  'common/telemetry/activity/activity.writer.ts': 'flushes this copy’s own buffered activity rows',
  'modules/people/presence/last-seen.service.ts': 'flushes this copy’s own queued last-seen users',
};

/** Jobs that start no timer in a test boot, and why (every other registered job must). */
const NO_TIMERS = new Map([
  ['config-reload', 'its kick is all it does'],
  ['template-boot-check', 'only with a configured line (template.registry tests)'],
]);

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('process roles on the real AppModule (docs/09)', () => {
  const jobs = [...backgroundJobs().keys()];
  const timed = jobs.filter((name) => !NO_TIMERS.has(name));

  it('registers every job (the list below is not hand-kept: @BackgroundJob fills it)', () => {
    expect(jobs.length).toBeGreaterThan(15);
    for (const name of NO_TIMERS.keys()) expect(jobs).toContain(name);
  });

  it('api: no job starts a timer and only the per-copy caches do (two copies never both send, remind or sync)', async () => {
    const probe = await bootIn('api', 25);
    expect([...probe.jobTimers.keys()]).toEqual([]);
    expect(probe.tickers).toEqual([]);
    expect([...probe.otherTimers].filter((file) => !(file in PER_COPY))).toEqual([]);
  }, 60_000);

  it('worker: every registered job starts its timers', async () => {
    const probe = await bootIn('worker');
    expect(timed.filter((name) => !probe.jobTimers.has(name))).toEqual([]);
    expect(probe.tickers).not.toContain('outside a job');
  }, 60_000);

  it('all (unset, local dev and tests): every registered job starts, as one process did before', async () => {
    const probe = await bootIn('');
    expect(timed.filter((name) => !probe.jobTimers.has(name))).toEqual([]);
  }, 60_000);
});
