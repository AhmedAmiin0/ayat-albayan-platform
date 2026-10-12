import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../common/audit/audit.service';
import { fakeDb, type FakeResult } from '../guardians/fake-db';
import { StudentStatusQueries } from './student-status.queries';

function setup(results: Record<string, FakeResult[]>) {
  const t = fakeDb(results);
  const audit = { record: vi.fn() };
  return { ...t, audit, q: new StudentStatusQueries(t.db, audit as unknown as AuditService) };
}
const eqs = (t: ReturnType<typeof setup>, table: string) =>
  t.calls.filter((c) => c.table === table && c.method === 'eq').map((c) => c.args);
const MOVE = { studentId: 's1', from: 'active', to: 'pending_renewal' } as const;

describe('StudentStatusQueries: compare-and-set moves, audited only when they change a row', () => {
  it('move: CAS on the status read, then the audit with the extra fields', async () => {
    const t = setup({ students: [{ data: { id: 's1' } }] });
    expect(await t.q.move(MOVE, { actorId: null, after: { via: 'subscription_ended' } })).toBe(true);
    expect(t.argsOf('students', 'update')).toEqual([{ status: 'pending_renewal' }]);
    expect(eqs(t, 'students')).toEqual([['id', 's1'], ['status', 'active']]);
    expect(t.audit.record).toHaveBeenCalledWith({
      actorId: null, entity: 'students', entityId: 's1', action: 'status_change',
      before: { status: 'active' }, after: { status: 'pending_renewal', via: 'subscription_ended' },
    });
  });

  it('a CAS miss (someone changed it, or a second call) → false, no audit', async () => {
    const t = setup({ students: [{ data: null }] });
    expect(await t.q.move(MOVE, { actorId: 'a1', after: {} })).toBe(false);
    expect(t.audit.record).not.toHaveBeenCalled();
  });

  it('a db error is thrown', async () => {
    const t = setup({ students: [{ error: { message: 'boom' } }] });
    await expect(t.q.move(MOVE, { actorId: 'a1', after: {} })).rejects.toThrow();
  });

  it('lastStatusChange: the newest students status_change row', async () => {
    const row = { after: { status: 'active', via: 'payment' }, at: '2026-10-01T00:00:00Z' };
    const t = setup({ audit_log: [{ data: row }] });
    expect(await t.q.lastStatusChange('s1')).toEqual(row);
    expect(eqs(t, 'audit_log')).toEqual([['entity', 'students'], ['entity_id', 's1'], ['action', 'status_change']]);
    expect(t.argsOf('audit_log', 'order')).toEqual(['at', { ascending: false }]);
  });

  it('hasPositivePayment: kind payment, amount > 0, any of the student’s packages', async () => {
    const t = setup({ payments: [{ count: 1 }, { count: 0 }] });
    expect(await t.q.hasPositivePayment('s1')).toBe(true);
    expect(await t.q.hasPositivePayment('s1')).toBe(false);
    expect(eqs(t, 'payments').slice(0, 2)).toEqual([['subscription.student_id', 's1'], ['kind', 'payment']]);
    expect(t.argsOf('payments', 'gt')).toEqual(['amount', 0]);
  });

  it('student: status and tz', async () => {
    const t = setup({ students: [{ data: { status: 'active', tz: 'Asia/Riyadh' } }] });
    expect(await t.q.student('s1')).toEqual({ status: 'active', tz: 'Asia/Riyadh' });
  });
});
