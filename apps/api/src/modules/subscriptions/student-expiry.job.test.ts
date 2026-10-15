import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeSettings } from '../../common/settings/settings.fakes';
import { StudentExpiryJob } from './student-expiry.job';
import type { StudentExpiryQueries } from './student-expiry.queries';
import type { StudentStatusQueries } from './student-status.queries';

const NOW = new Date('2026-10-15T06:00:00Z');
const PENDING = (at: string) => ({ after: { status: 'pending_renewal', via: 'subscription_ended' }, at });

function setup(o: { ids?: string[]; last?: unknown; end?: string | null; paid?: boolean; days?: number; moved?: boolean } = {}) {
  const queries = {
    pendingRenewal: vi.fn(async () => o.ids ?? ['s1']),
    packageEnd: vi.fn(async () => (o.end === undefined ? null : o.end)),
    paidSince: vi.fn(async () => o.paid ?? false),
  };
  const statuses = {
    lastStatusChange: vi.fn(async () => (o.last === undefined ? PENDING('2026-10-07T06:00:00Z') : o.last)),
    move: vi.fn(async () => o.moved ?? true),
  };
  const settings = fakeSettings({ subscription_expiry_days: o.days ?? 7 });
  const job = new StudentExpiryJob(queries as unknown as StudentExpiryQueries, statuses as unknown as StudentStatusQueries, settings);
  return { job, queries, statuses };
}
const EXPIRED = [
  { studentId: 's1', from: 'pending_renewal', to: 'expired' },
  { actorId: null, after: { via: 'subscription_expired', from: 'pending_renewal', to: 'expired', reason: 'subscription_expired' } },
];

describe('StudentExpiryJob.runOnce: pending_renewal → expired after N days (owner 2026-10-15)', () => {
  it('pending_renewal for 8 days (≥ 7), nothing paid since → expired, audited with no actor', async () => {
    const t = setup();
    expect(await t.job.runOnce(NOW)).toEqual({ students: 1, expired: 1, failed: 0 });
    expect(t.statuses.move).toHaveBeenCalledWith(...EXPIRED);
    expect(t.queries.paidSince).toHaveBeenCalledWith('s1', '2026-10-07T06:00:00Z');
    expect(t.queries.packageEnd).not.toHaveBeenCalled();
  });

  it('not yet N days, or a positive payment since → stays', async () => {
    expect((await setup({ days: 10 }).job.runOnce(NOW)).expired).toBe(0);
    const paid = setup({ paid: true });
    expect((await paid.job.runOnce(NOW)).expired).toBe(0);
    expect(paid.statuses.move).not.toHaveBeenCalled();
  });

  it('no pending_renewal audit row: since = the package end; no package end → skipped', async () => {
    const t = setup({ last: { after: { status: 'pending_renewal' }, at: 'x' } });
    await t.job.runOnce(NOW);
    expect(t.queries.packageEnd).not.toHaveBeenCalled();
    const fromEnd = setup({ last: { after: { status: 'active', via: 'payment' }, at: '2026-10-14T00:00:00Z' }, end: '2026-10-01' });
    expect((await fromEnd.job.runOnce(NOW)).expired).toBe(1);
    expect(fromEnd.queries.paidSince).toHaveBeenCalledWith('s1', '2026-10-01');
    const none = setup({ last: null, end: null });
    expect((await none.job.runOnce(NOW)).expired).toBe(0);
    expect(none.queries.paidSince).not.toHaveBeenCalled();
  });

  it('idempotent: a CAS miss (already expired, or changed by hand) → not counted', async () => {
    expect(await setup({ moved: false }).job.runOnce(NOW)).toEqual({ students: 1, expired: 0, failed: 0 });
  });

  it('never throws: one failing student is counted, the others still run; a failed list aborts quietly', async () => {
    const t = setup({ ids: ['s1', 's2'] });
    t.statuses.lastStatusChange.mockRejectedValueOnce(new Error('db down'));
    expect(await t.job.runOnce(NOW)).toEqual({ students: 2, expired: 1, failed: 1 });
    const down = setup();
    down.queries.pendingRenewal.mockRejectedValueOnce(new Error('db down'));
    expect(await down.job.runOnce(NOW)).toEqual({ students: 0, expired: 0, failed: 0 });
  });
});

describe('StudentExpiryJob timers', () => {
  afterEach(() => vi.useRealTimers());

  it('first run delayed (not on boot), then daily; cleared on destroy', () => {
    vi.useFakeTimers();
    const t = setup();
    const run = vi.spyOn(t.job, 'runOnce').mockResolvedValue({ students: 0, expired: 0, failed: 0 });
    t.job.onApplicationBootstrap();
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10 * 60_000);
    expect(run).toHaveBeenCalledTimes(1);
    t.job.onModuleDestroy();
    vi.advanceTimersByTime(86_400_000);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
