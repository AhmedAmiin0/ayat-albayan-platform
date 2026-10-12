import { describe, expect, it, vi } from 'vitest';
import type { LeadConversion } from './lead-conversion';
import { MoneyFollowUps } from './money-follow-ups';
import type { StudentActivation } from './student-activation';

function setup() {
  const leads = { afterPackage: vi.fn() };
  const students = { afterPayment: vi.fn() };
  const follow = new MoneyFollowUps(leads as unknown as LeadConversion, students as unknown as StudentActivation);
  return { leads, students, follow };
}
const IDS = { studentId: 's1', actorId: 'u1' };

describe('MoneyFollowUps: what a money write changes outside money', () => {
  it('a new package converts the family’s lead, and never activates the student', async () => {
    const t = setup();
    await t.follow.after({ entity: 'subscriptions', action: 'create' }, IDS);
    expect(t.leads.afterPackage).toHaveBeenCalledWith('s1', 'u1');
    expect(t.students.afterPayment).not.toHaveBeenCalled();
  });

  it('a new payment (admin or sales path alike) activates a trial student, with the recorder as actor', async () => {
    const t = setup();
    await t.follow.after({ entity: 'payments', action: 'create', after: { kind: 'payment', amount: 290 } }, IDS);
    expect(t.students.afterPayment).toHaveBeenCalledWith('s1', 'u1');
    expect(t.leads.afterPackage).not.toHaveBeenCalled();
  });

  it('a refund, an edit or a delete changes nothing (a deleted payment never reverts the status)', async () => {
    const t = setup();
    await t.follow.after({ entity: 'payments', action: 'create', after: { kind: 'refund', amount: 290 } }, IDS);
    await t.follow.after({ entity: 'payments', action: 'update', after: { kind: 'payment', amount: 290 } }, IDS);
    await t.follow.after({ entity: 'payments', action: 'delete' }, IDS);
    await t.follow.after({ entity: 'subscriptions', action: 'delete' }, IDS);
    expect(t.students.afterPayment).not.toHaveBeenCalled();
    expect(t.leads.afterPackage).not.toHaveBeenCalled();
  });
});
