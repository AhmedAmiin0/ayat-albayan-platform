import { describe, expect, it, vi } from 'vitest';
import { StudentDeactivation } from './student-deactivation';
import type { StudentRenewal } from './student-renewal';
import type { StudentStatusQueries } from './student-status.queries';

const FLIP_P1 = { after: { status: 'active', via: 'payment', payment_id: 'p1' }, at: '2026-10-01T09:00:00Z' };
const PAYMENT = { id: 'p1', kind: 'payment', amount: 290 };
const IDS = { studentId: 's1', actorId: 'admin1' };

function setup(o: { last?: unknown; status?: string; other?: boolean; ended?: boolean; moved?: boolean } = {}) {
  const statuses = {
    lastStatusChange: vi.fn(async () => (o.last === undefined ? FLIP_P1 : o.last)),
    student: vi.fn(async () => ({ status: o.status ?? 'active', tz: 'Asia/Riyadh' })),
    hasPositivePayment: vi.fn(async () => o.other ?? false),
    move: vi.fn(async () => o.moved ?? true),
  };
  const renewal = { ended: vi.fn(async () => o.ended ?? false) };
  const d = new StudentDeactivation(statuses as unknown as StudentStatusQueries, renewal as unknown as StudentRenewal);
  return { statuses, renewal, d };
}
const audited = (to: string) => [
  { studentId: 's1', from: 'active', to },
  { actorId: 'admin1', after: { via: 'payment_deleted', payment_id: 'p1' } },
];

describe('StudentDeactivation: an older flip (no recorded from) reverts by the old rules', () => {
  it('no positive payment left → trial, audited by the deleting admin with the payment id', async () => {
    const t = setup();
    expect(await t.d.afterDelete(PAYMENT, IDS)).toBe(true);
    expect(t.statuses.move).toHaveBeenCalledWith(...audited('trial'));
    expect(t.renewal.ended).not.toHaveBeenCalled();
  });

  it('another payment remains → active (no change, no audit), or pending_renewal when the subscription ended', async () => {
    const running = setup({ other: true, ended: false });
    expect(await running.d.afterDelete(PAYMENT, IDS)).toBe(false);
    expect(running.statuses.move).not.toHaveBeenCalled();
    const ended = setup({ other: true, ended: true });
    expect(await ended.d.afterDelete(PAYMENT, IDS)).toBe(true);
    expect(ended.statuses.move).toHaveBeenCalledWith(...audited('pending_renewal'));
    expect(ended.renewal.ended).toHaveBeenCalledWith('s1', 'Asia/Riyadh');
  });

  it('a status set by hand afterwards, or a flip by another payment, wins: nothing reverted', async () => {
    for (const last of [{ after: { status: 'paused' }, at: 'x' }, { ...FLIP_P1, after: { ...FLIP_P1.after, payment_id: 'p2' } }, null]) {
      const t = setup({ last });
      expect(await t.d.afterDelete(PAYMENT, IDS)).toBe(false);
      expect(t.statuses.move).not.toHaveBeenCalled();
    }
  });

  it('a refund or a zero payment never reverts; a CAS miss (a second call) → false', async () => {
    const t = setup();
    expect(await t.d.afterDelete({ ...PAYMENT, kind: 'refund' }, IDS)).toBe(false);
    expect(await t.d.afterDelete({ ...PAYMENT, amount: 0 }, IDS)).toBe(false);
    expect(t.statuses.lastStatusChange).not.toHaveBeenCalled();
    const miss = setup({ moved: false });
    expect(await miss.d.afterDelete(PAYMENT, IDS)).toBe(false);
  });

  it('a second call after the revert: the student is already trial → no-op', async () => {
    const t = setup({ status: 'trial' });
    expect(await t.d.afterDelete(PAYMENT, IDS)).toBe(false);
    expect(t.statuses.move).not.toHaveBeenCalled();
  });
});

describe('StudentDeactivation: a flip that recorded its from-status goes back to it (owner 2026-10-15)', () => {
  const flipFrom = (from: string) => ({ ...FLIP_P1, after: { ...FLIP_P1.after, from, reason: 'payment' } });

  it('back to the recorded status while still active, audited payment_deleted with from active', async () => {
    for (const from of ['new', 'trial', 'pending_subscription', 'pending_renewal', 'expired']) {
      const t = setup({ last: flipFrom(from), other: true, ended: true });
      expect(await t.d.afterDelete(PAYMENT, IDS)).toBe(true);
      expect(t.statuses.move).toHaveBeenCalledWith(
        { studentId: 's1', from: 'active', to: from },
        { actorId: 'admin1', after: { via: 'payment_deleted', payment_id: 'p1', from: 'active', reason: 'payment_deleted' } },
      );
      expect(t.statuses.hasPositivePayment).not.toHaveBeenCalled();
    }
  });

  it('no longer active (moved since), or an unknown from value: nothing', async () => {
    const moved = setup({ last: flipFrom('trial'), status: 'pending_renewal' });
    expect(await moved.d.afterDelete(PAYMENT, IDS)).toBe(false);
    expect(moved.statuses.move).not.toHaveBeenCalled();
    const odd = setup({ last: flipFrom('paused') });
    expect(await odd.d.afterDelete(PAYMENT, IDS)).toBe(false);
    expect(odd.statuses.move).not.toHaveBeenCalled();
  });
});
