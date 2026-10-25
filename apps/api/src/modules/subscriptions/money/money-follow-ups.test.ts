import { describe, expect, it, vi } from 'vitest';
import type { LeadConversion } from '../student-lifecycle/lead-conversion';
import { MoneyFollowUps } from './money-follow-ups';
import type { StudentActivation } from '../student-lifecycle/student-activation';
import type { StudentDeactivation } from '../student-lifecycle/student-deactivation';

function setup() {
  const leads = { afterPackage: vi.fn() };
  const students = { afterPayment: vi.fn() };
  const revert = { afterDelete: vi.fn() };
  const follow = new MoneyFollowUps(
    leads as unknown as LeadConversion,
    students as unknown as StudentActivation,
    revert as unknown as StudentDeactivation,
  );
  return { leads, students, revert, follow };
}
const IDS = { studentId: 's1', actorId: 'u1' };
const PAID = { id: 'p1', kind: 'payment', amount: 290 };

describe('MoneyFollowUps: what a money write changes outside money', () => {
  it('a new package converts the family’s lead, and never activates the student', async () => {
    const t = setup();
    await t.follow.after({ entity: 'subscriptions', action: 'create' }, IDS);
    expect(t.leads.afterPackage).toHaveBeenCalledWith('s1', 'u1');
    expect(t.students.afterPayment).not.toHaveBeenCalled();
  });

  it('a new payment (admin or sales path alike) activates a trial student, with the recorder and the payment id', async () => {
    const t = setup();
    await t.follow.after({ entity: 'payments', entityId: 'p1', action: 'create', after: PAID }, IDS);
    expect(t.students.afterPayment).toHaveBeenCalledWith('s1', 'u1', 'p1');
    expect(t.leads.afterPackage).not.toHaveBeenCalled();
  });

  it('deleting a positive payment runs the revert with the full before row and the deleting admin', async () => {
    const t = setup();
    await t.follow.after({ entity: 'payments', entityId: 'p1', action: 'delete', before: PAID }, IDS);
    expect(t.revert.afterDelete).toHaveBeenCalledWith(PAID, IDS);
    expect(t.students.afterPayment).not.toHaveBeenCalled();
  });

  it('a refund, an edit, a deleted refund or a deleted package changes nothing', async () => {
    const t = setup();
    await t.follow.after({ entity: 'payments', entityId: 'p1', action: 'create', after: { ...PAID, kind: 'refund' } }, IDS);
    await t.follow.after({ entity: 'payments', entityId: 'p1', action: 'update', before: PAID, after: PAID }, IDS);
    await t.follow.after({ entity: 'payments', entityId: 'p1', action: 'delete', before: { ...PAID, kind: 'refund' } }, IDS);
    await t.follow.after({ entity: 'subscriptions', action: 'delete', before: PAID }, IDS);
    expect(t.students.afterPayment).not.toHaveBeenCalled();
    expect(t.revert.afterDelete).not.toHaveBeenCalled();
    expect(t.leads.afterPackage).not.toHaveBeenCalled();
  });
});
