import type { JobBeat } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { ar } from '@/common/infra/i18n/server-text';
import type { PushService } from '@/common/push/push.service';
import { StaleAlerts } from './stale-alerts';

const MIN = 60_000;
const beat = (over: Partial<JobBeat> = {}): JobBeat => ({
  name: 'RemindersJob', everyMs: 5 * MIN, since: 0, lastOkAt: null, lastErrorAt: null, lastError: null, ...over,
});

function setup() {
  const notifyAdmins = vi.fn<PushService['notifyAdmins']>().mockResolvedValue(undefined);
  const alerts = new StaleAlerts({ notifyAdmins } as unknown as PushService);
  return { alerts, notifyAdmins };
}

describe('StaleAlerts (one admin bell alert per stale job, deduplicated)', () => {
  it('a job stale for the first time raises one bell-only alert, with its day in the dedup key', async () => {
    const t = setup();
    const now = Date.parse('2026-11-21T10:00:00Z');
    await t.alerts.check([beat({ lastOkAt: now - 40 * MIN, lastError: 'fetch timed out' })], now);
    expect(t.notifyAdmins).toHaveBeenCalledTimes(1);
    const [kind, event] = t.notifyAdmins.mock.calls[0] ?? [];
    expect(kind).toBe('google_sync_alert');
    expect(event).toMatchObject({
      subject: 'job_stale:RemindersJob:2026-11-21',
      title: ar.backgroundJobs.staleTitle,
      bellOnly: true,
    });
    expect(event?.vars.reason).toContain('RemindersJob');
    expect(event?.vars.reason).toContain('40');
    expect(event?.vars.reason).toContain('fetch timed out');
  });

  it('still stale on the next checks: no second alert', async () => {
    const t = setup();
    const b = beat();
    await t.alerts.check([b], 20 * MIN);
    await t.alerts.check([b], 21 * MIN);
    expect(t.notifyAdmins).toHaveBeenCalledTimes(1);
  });

  it('fresh again, then stale again: a new alert', async () => {
    const t = setup();
    await t.alerts.check([beat()], 20 * MIN);
    await t.alerts.check([beat({ lastOkAt: 20 * MIN })], 21 * MIN);
    await t.alerts.check([beat({ lastOkAt: 20 * MIN })], 40 * MIN);
    expect(t.notifyAdmins).toHaveBeenCalledTimes(2);
  });

  it('fresh jobs raise nothing; no error yet reads as «none»', async () => {
    const t = setup();
    await t.alerts.check([beat({ lastOkAt: 9 * MIN })], 10 * MIN);
    expect(t.notifyAdmins).not.toHaveBeenCalled();
    await t.alerts.check([beat({ name: 'X' })], 20 * MIN);
    expect(t.notifyAdmins.mock.calls[0]?.[1].vars.reason).toContain(ar.backgroundJobs.noError);
  });

  it('a failed alert (an Error or not) is tried again on the next check', async () => {
    const t = setup();
    t.notifyAdmins.mockRejectedValueOnce(new Error('db down'));
    await t.alerts.check([beat()], 20 * MIN);
    await t.alerts.check([beat()], 21 * MIN);
    expect(t.notifyAdmins).toHaveBeenCalledTimes(2);
  });

  it('a rejected non-Error is logged as text', async () => {
    const t = setup();
    t.notifyAdmins.mockRejectedValueOnce('db down');
    await expect(t.alerts.check([beat()], 20 * MIN)).resolves.toBeUndefined();
    await t.alerts.check([beat()], 21 * MIN);
    expect(t.notifyAdmins).toHaveBeenCalledTimes(2);
  });
});
