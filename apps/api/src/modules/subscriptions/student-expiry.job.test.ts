import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeSettings } from '../../common/settings/settings.fakes';
import { StudentExpiryJob } from './student-expiry.job';
import type { StudentExpiryQueries } from './student-expiry.queries';
import type { StudentStatusQueries } from './student-status.queries';

const NOW = new Date('2026-10-15T06:00:00Z');
const PENDING = (at: string) => ({ after: { status: 'pending_renewal', via: 'subscription_ended' }, at });

function setup(o: { ids?: string[]; last?: unknown; paid?: boolean; days?: number; moved?: boolean } = {}) {
  const queries = {
    pendingRenewal: vi.fn(async () => o.ids ?? ['s1']),
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
  });

  it('not yet N days, or a positive payment since → stays', async () => {
    expect((await setup({ days: 10 }).job.runOnce(NOW)).expired).toBe(0);
    const paid = setup({ paid: true });
    expect((await paid.job.runOnce(NOW)).expired).toBe(0);
    expect(paid.statuses.move).not.toHaveBeenCalled();
  });

  it('no pending_renewal audit row: the clock starts now (audited CAS row), expired N days after that', async () => {
    const CLOCK = [
      { studentId: 's1', from: 'pending_renewal', to: 'pending_renewal' },
      { actorId: null, after: { via: 'expiry_clock_started' } },
    ];
    for (const last of [null, { after: { status: 'active', via: 'payment' }, at: '2026-09-01T00:00:00Z' }]) {
      const t = setup({ last });
      expect((await t.job.runOnce(NOW)).expired).toBe(0);
      expect(t.statuses.move).toHaveBeenCalledTimes(1);
      expect(t.statuses.move).toHaveBeenCalledWith(...CLOCK);
      expect(t.queries.paidSince).not.toHaveBeenCalled();
    }
    // the clock row it wrote reads back as pending_renewal since then
    const clock = { after: { status: 'pending_renewal', via: 'expiry_clock_started' }, at: NOW.toISOString() };
    expect((await setup({ last: clock }).job.runOnce(new Date('2026-10-21T06:00:00Z'))).expired).toBe(0);
    const later = setup({ last: clock });
    expect((await later.job.runOnce(new Date('2026-10-22T06:00:00Z'))).expired).toBe(1);
    expect(later.statuses.move).toHaveBeenCalledWith(...EXPIRED);
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
