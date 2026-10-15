import { describe, expect, it, vi } from 'vitest';
import { StudentDeactivation } from './student-deactivation';
import type { StudentRenewal } from './student-renewal';
import type { StudentStatusQueries } from './student-status.queries';
import type { TrialLessonRow } from './student-trial.plan';
import type { StudentTrialQueries } from './student-trial.queries';

const FLIP_P1 = { after: { status: 'active', via: 'payment', payment_id: 'p1' }, at: '2026-10-01T09:00:00Z' };
const PAYMENT = { id: 'p1', kind: 'payment', amount: 290 };
const IDS = { studentId: 's1', actorId: 'admin1' };

type Opts = { last?: unknown; status?: string; other?: boolean; ended?: boolean; moved?: boolean; lessons?: TrialLessonRow[] };
const lessonRow = (status: 'scheduled' | 'completed'): TrialLessonRow => ({
  student_id: 's1',
  attendance: null,
  chargeable: true,
  lesson: { status, rule_id: 'r1', instant: false, makeup_of_id: null, rule: { package: 'trial' } },
});

function setup(o: Opts = {}) {
  const statuses = {
    lastStatusChange: vi.fn(async () => (o.last === undefined ? FLIP_P1 : o.last)),
    student: vi.fn(async () => ({ status: o.status ?? 'active', tz: 'Asia/Riyadh' })),
    hasPositivePayment: vi.fn(async () => o.other ?? false),
    move: vi.fn(async () => o.moved ?? true),
  };
  const renewal = { ended: vi.fn(async () => o.ended ?? false) };
  const trials = { lessonsOf: vi.fn(async () => o.lessons ?? []) };
  const d = new StudentDeactivation(
    statuses as unknown as StudentStatusQueries,
    renewal as unknown as StudentRenewal,
    trials as unknown as StudentTrialQueries,
  );
  return { statuses, renewal, trials, d };
}
const audited = (to: string) => [
  { studentId: 's1', from: 'active', to },
  { actorId: 'admin1', after: { via: 'payment_deleted', payment_id: 'p1' } },
];

describe('StudentDeactivation: an older flip (no recorded from) reverts by the old rules', () => {
  it('no positive payment left → new, audited by the deleting admin with the payment id', async () => {
    const t = setup();
    expect(await t.d.afterDelete(PAYMENT, IDS)).toBe(true);
    expect(t.statuses.move).toHaveBeenCalledWith(...audited('new'));
    expect(t.renewal.ended).not.toHaveBeenCalled();
    expect(t.trials.lessonsOf).toHaveBeenCalledWith(['s1']);
  });

  it('none left, by the trial facts: an attended trial → pending_subscription, an open one → trial', async () => {
    const attended = setup({ lessons: [lessonRow('completed')] });
    await attended.d.afterDelete(PAYMENT, IDS);
    expect(attended.statuses.move).toHaveBeenCalledWith(...audited('pending_subscription'));
    const open = setup({ lessons: [lessonRow('scheduled')] });
    await open.d.afterDelete(PAYMENT, IDS);
    expect(open.statuses.move).toHaveBeenCalledWith(...audited('trial'));
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

  it('a second call after the revert: the student is already new → no-op', async () => {
    const t = setup({ status: 'new' });
    expect(await t.d.afterDelete(PAYMENT, IDS)).toBe(false);
    expect(t.statuses.move).not.toHaveBeenCalled();
  });
});

describe('StudentDeactivation: a flip that recorded its from-status goes back to it (owner 2026-10-15)', () => {
  const flipFrom = (from: string) => ({ ...FLIP_P1, after: { ...FLIP_P1.after, from, reason: 'payment' } });

  const reverted = (to: string) => [
    { studentId: 's1', from: 'active', to },
    { actorId: 'admin1', after: { via: 'payment_deleted', payment_id: 'p1', from: 'active', reason: 'payment_deleted' } },
  ];

  it('a not-subscribed from and no other positive payment → back to it', async () => {
    for (const from of ['new', 'trial', 'pending_subscription']) {
      const t = setup({ last: flipFrom(from), other: false });
      expect(await t.d.afterDelete(PAYMENT, IDS)).toBe(true);
      expect(t.statuses.move).toHaveBeenCalledWith(...reverted(from));
      expect(t.renewal.ended).not.toHaveBeenCalled();
    }
  });

  it('a not-subscribed from but another positive payment remains → active (no move), or pending_renewal when ended', async () => {
    const running = setup({ last: flipFrom('trial'), other: true, ended: false });
    expect(await running.d.afterDelete(PAYMENT, IDS)).toBe(false);
    expect(running.statuses.move).not.toHaveBeenCalled();
    const ended = setup({ last: flipFrom('pending_subscription'), other: true, ended: true });
    expect(await ended.d.afterDelete(PAYMENT, IDS)).toBe(true);
    expect(ended.statuses.move).toHaveBeenCalledWith(...audited('pending_renewal'));
    expect(ended.trials.lessonsOf).not.toHaveBeenCalled();
  });

  it('a recorded pending_renewal / expired → back to it while still active, payments not read', async () => {
    for (const from of ['pending_renewal', 'expired']) {
      const t = setup({ last: flipFrom(from), other: true, ended: true });
      expect(await t.d.afterDelete(PAYMENT, IDS)).toBe(true);
      expect(t.statuses.move).toHaveBeenCalledWith(...reverted(from));
      expect(t.statuses.hasPositivePayment).not.toHaveBeenCalled();
    }
  });

  it('no longer active (moved since), or an unknown from value: nothing', async () => {
    const moved = setup({ last: flipFrom('expired'), status: 'pending_renewal' });
    expect(await moved.d.afterDelete(PAYMENT, IDS)).toBe(false);
    expect(moved.statuses.move).not.toHaveBeenCalled();
    const odd = setup({ last: flipFrom('paused') });
    expect(await odd.d.afterDelete(PAYMENT, IDS)).toBe(false);
    expect(odd.statuses.move).not.toHaveBeenCalled();
  });
});
