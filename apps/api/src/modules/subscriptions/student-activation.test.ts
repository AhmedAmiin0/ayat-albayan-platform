import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../common/audit/audit.service';
import { fakeDb, type FakeResult } from '../guardians/fake-db';
import { activatesStudent, StudentActivation } from './student-activation';

function setup(students: FakeResult[]) {
  const t = fakeDb({ students });
  const audit = { record: vi.fn() };
  return { ...t, audit, activation: new StudentActivation(t.db, audit as unknown as AuditService) };
}

describe('StudentActivation: a trial student becomes «مشترك» on its first payment', () => {
  it('trial → active by compare-and-set on status = trial, audited as a status_change by the recorder', async () => {
    const t = setup([{ data: { id: 's1' } }]);
    expect(await t.activation.afterPayment('s1', 'sales1')).toBe(true);
    expect(t.argsOf('students', 'update')).toEqual([{ status: 'active' }]);
    expect(t.calls.filter((c) => c.table === 'students' && c.method === 'eq').map((c) => c.args)).toEqual([
      ['id', 's1'],
      ['status', 'trial'],
    ]);
    expect(t.audit.record).toHaveBeenCalledWith({
      actorId: 'sales1',
      entity: 'students',
      entityId: 's1',
      action: 'status_change',
      before: { status: 'trial' },
      after: { status: 'active', via: 'payment' },
    });
  });

  it('not in trial (already active, paused, churned) or a replay → nothing changes, no audit', async () => {
    const t = setup([{ data: null }]);
    expect(await t.activation.afterPayment('s1', 'admin1')).toBe(false);
    expect(t.audit.record).not.toHaveBeenCalled();
  });

  it('a db error is thrown', async () => {
    const t = setup([{ error: { message: 'boom' } }]);
    await expect(t.activation.afterPayment('s1', 'admin1')).rejects.toThrow();
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
