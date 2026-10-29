import { describe, expect, it, vi } from 'vitest';
import type { PushService } from '../../../../common/push/push.service';
import { fakeDb, type FakeResult } from '../../../people/guardians/fake-db';
import { CommissionBell } from './commission-bell';

const NOW = new Date('2026-10-29T16:42:20Z');
const ROW = { id: 'ca03d8c8', assistant_id: 'alzahra', amount: 50, currency: 'EGP', student: { code: 'AB-1022', name: 'lmkl' } };

function setup(result: FakeResult) {
  const { db, calls } = fakeDb({ assistant_commissions: [result] });
  const push = { notifyProfiles: vi.fn().mockResolvedValue(undefined) };
  return { bell: new CommissionBell(db, push as unknown as PushService), push, calls };
}

describe('CommissionBell («عمولة جديدة», owner 2026-10-29)', () => {
  it('a commission just earned: one bell row to its assistant (who brought the student), bell only, keyed by the commission', async () => {
    const t = setup({ data: [ROW] });
    await t.bell.notify('student-1', NOW);
    expect(t.push.notifyProfiles).toHaveBeenCalledTimes(1);
    expect(t.push.notifyProfiles).toHaveBeenCalledWith({
      kind: 'commission_earned',
      profileIds: ['alzahra'],
      subject: 'ca03d8c8',
      bellOnly: true,
      vars: { amount: '+50 ج.م', code: 'AB-1022', student: 'lmkl' },
      data: { commissionId: 'ca03d8c8' },
    });
  });

  it('asks only for the student’s earned rows inserted in the last 5 minutes (created_at: a statement rebuild touches old rows)', async () => {
    const t = setup({ data: [] });
    await t.bell.notify('student-1', NOW);
    const of = (m: string) => t.calls.filter((c) => c.method === m).map((c) => c.args);
    expect(of('eq')).toEqual([['student_id', 'student-1'], ['status', 'earned']]);
    expect(of('gte')).toEqual([['created_at', '2026-10-29T16:37:20.000Z']]);
    expect(t.push.notifyProfiles).not.toHaveBeenCalled();
  });

  it('a site currency reads its symbol; an unknown one its code', async () => {
    const t = setup({ data: [{ ...ROW, amount: 12.5, currency: 'SAR' }, { ...ROW, id: 'c2', currency: 'GBP' }] });
    await t.bell.notify('student-1', NOW);
    const amounts = t.push.notifyProfiles.mock.calls.map((c) => (c[0] as { vars: { amount: string } }).vars.amount);
    expect(amounts).toEqual(['+12.5 ر.س', '+50 GBP']);
  });

  it('a database error is logged, never thrown, and tells no one', async () => {
    const t = setup({ error: { message: 'boom' } });
    await expect(t.bell.notify('student-1', NOW)).resolves.toBeUndefined();
    expect(t.push.notifyProfiles).not.toHaveBeenCalled();
  });

  it('called twice for the same write: the same subject both times (PushService keeps one row per commission)', async () => {
    const { db } = fakeDb({ assistant_commissions: [{ data: [ROW] }, { data: [ROW] }] });
    const push = { notifyProfiles: vi.fn().mockResolvedValue(undefined) };
    const bell = new CommissionBell(db, push as unknown as PushService);
    await bell.notify('student-1', NOW);
    await bell.notify('student-1', NOW);
    expect(push.notifyProfiles.mock.calls.map((c) => (c[0] as { subject: string }).subject)).toEqual(['ca03d8c8', 'ca03d8c8']);
  });
});
