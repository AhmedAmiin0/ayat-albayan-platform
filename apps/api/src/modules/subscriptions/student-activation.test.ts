import { describe, expect, it, vi } from 'vitest';
import { activatesStudent, StudentActivation } from './student-activation';
import type { StudentStatusQueries } from './student-status.queries';

function setup(moved: boolean) {
  const statuses = { move: vi.fn(async () => moved) };
  return { statuses, activation: new StudentActivation(statuses as unknown as StudentStatusQueries) };
}

describe('StudentActivation: a trial student becomes «مشترك» on its first payment', () => {
  it('trial → active by compare-and-set, audited by the recorder with the payment id', async () => {
    const t = setup(true);
    expect(await t.activation.afterPayment('s1', 'sales1', 'p1')).toBe(true);
    expect(t.statuses.move).toHaveBeenCalledWith(
      { studentId: 's1', from: 'trial', to: 'active' },
      { actorId: 'sales1', after: { via: 'payment', payment_id: 'p1' } },
    );
  });

  it('not in trial (active, pending renewal, paused, churned) or a replay → the CAS misses, false', async () => {
    const t = setup(false);
    expect(await t.activation.afterPayment('s1', 'admin1', 'p1')).toBe(false);
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
