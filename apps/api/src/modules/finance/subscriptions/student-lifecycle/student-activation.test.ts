import { describe, expect, it, vi } from 'vitest';
import { activatesStudent, StudentActivation } from './student-activation';
import type { StudentStatusQueries } from './student-status.queries';

function setup(o: { status?: string | null; moved?: boolean } = {}) {
  const status = o.status === undefined ? 'trial' : o.status;
  const statuses = {
    student: vi.fn(async () => (status === null ? null : { status, tz: 'Asia/Riyadh' })),
    move: vi.fn(async () => o.moved ?? true),
  };
  return { statuses, activation: new StudentActivation(statuses as unknown as StudentStatusQueries) };
}

describe('StudentActivation: a positive payment makes the student «مشترك» (owner 2026-10-15)', () => {
  it('new / trial / pending_subscription / pending_renewal / expired → active, audited with the payment id and from', async () => {
    for (const from of ['new', 'trial', 'pending_subscription', 'pending_renewal', 'expired']) {
      const t = setup({ status: from });
      expect(await t.activation.afterPayment('s1', 'sales1', 'p1')).toBe(true);
      expect(t.statuses.move).toHaveBeenCalledWith(
        { studentId: 's1', from, to: 'active' },
        { actorId: 'sales1', after: { via: 'payment', payment_id: 'p1', from, reason: 'payment' } },
      );
    }
  });

  it('active, paused, churned or a missing student: no move', async () => {
    for (const status of ['active', 'paused', 'churned', null]) {
      const t = setup({ status });
      expect(await t.activation.afterPayment('s1', 'admin1', 'p1')).toBe(false);
      expect(t.statuses.move).not.toHaveBeenCalled();
    }
  });

  it('a replay (the status changed under it) → the CAS misses, false', async () => {
    const t = setup({ moved: false });
    expect(await t.activation.afterPayment('s1', 'admin1', 'p1')).toBe(false);
  });
});

describe('activatesStudent: which payment rows count', () => {
  it('a payment of more than zero', () => {
    expect(activatesStudent({ kind: 'payment', amount: 290 })).toBe(true);
    expect(activatesStudent({ kind: 'payment', amount: '150.00' })).toBe(true);
  });

  it('never a refund, a zero amount or something that is not a row', () => {
    expect(activatesStudent({ kind: 'refund', amount: 290 })).toBe(false);
    expect(activatesStudent({ kind: 'payment', amount: 0 })).toBe(false);
    expect(activatesStudent(null)).toBe(false);
    expect(activatesStudent('payment')).toBe(false);
    expect(activatesStudent({ amount: 5 })).toBe(false);
  });
});
