import { describe, expect, it, vi } from 'vitest';
import type { PushService } from '../../../../common/push/push.service';
import { fakeDb, type FakeResult } from '../../../people/guardians/fake-db';
import { CommissionBell } from './commission-bell';

const NOW = new Date('2026-10-29T16:42:20Z');
const ROW = { id: 'ca03d8c8', assistant_id: 'alzahra', amount: 50, currency: 'EGP', student: { code: 'AB-1022', name: 'lmkl' } };
const EARN = { id: 'audit-1', entity_id: 'ca03d8c8' };
/** The signed number in LRI … PDI, as the bell body stores it. */
const signed = (n: string, currency: string) => `⁦+${n}⁩ ${currency}`;

function setup(audit: FakeResult[], commissions: FakeResult[] = []) {
  const { db, calls, trips } = fakeDb({ audit_log: audit, assistant_commissions: commissions });
  const push = { notifyProfiles: vi.fn().mockResolvedValue(undefined) };
  const subjects = () => push.notifyProfiles.mock.calls.map((c) => (c[0] as { subject: string }).subject);
  return { bell: new CommissionBell(db, push as unknown as PushService), push, calls, trips, subjects };
}

describe('CommissionBell («عمولة جديدة», owner 2026-10-29)', () => {
  it('an earning just audited: one bell row to the commission’s assistant (who brought the student), bell only, keyed by the audit row', async () => {
    const t = setup([{ data: [EARN] }], [{ data: [ROW] }]);
    await t.bell.notify(NOW);
    expect(t.push.notifyProfiles).toHaveBeenCalledTimes(1);
    expect(t.push.notifyProfiles).toHaveBeenCalledWith({
      kind: 'commission_earned',
      profileIds: ['alzahra'],
      subject: 'audit-1',
      bellOnly: true,
      vars: { amount: signed('50', 'ج.م'), code: 'AB-1022', student: 'lmkl' },
      data: { commissionId: 'ca03d8c8' },
    });
  });

  it('asks for the earn and reinstate audit rows of the last 5 minutes, then those commissions still earned; a voided one rings nothing', async () => {
    const t = setup([{ data: [EARN] }], [{ data: [] }]);
    await t.bell.notify(NOW);
    const of = (table: string, m: string) => t.calls.filter((c) => c.table === table && c.method === m).map((c) => c.args);
    expect(of('audit_log', 'eq')).toEqual([['entity', 'assistant_commissions']]);
    expect(of('audit_log', 'in')).toEqual([['action', ['earn', 'reinstate']]]);
    expect(of('audit_log', 'gte')).toEqual([['at', '2026-10-29T16:37:20.000Z']]);
    expect(of('assistant_commissions', 'in')).toEqual([['id', ['ca03d8c8']]]);
    expect(of('assistant_commissions', 'eq')).toEqual([['status', 'earned']]);
    expect(t.push.notifyProfiles).not.toHaveBeenCalled();
  });

  it('nothing earned lately: one read, no commission read, no bell', async () => {
    const t = setup([{ data: [] }]);
    await t.bell.notify(NOW);
    expect(t.trips).toEqual(['audit_log']);
    expect(t.push.notifyProfiles).not.toHaveBeenCalled();
  });

  it('paid, refunded, paid again: the re-earn (an UPDATE of the same row, old created_at) rings on its own reinstate row; a replay keeps that subject', async () => {
    const reinstate = { id: 'audit-2', entity_id: 'ca03d8c8' };
    const t = setup([{ data: [reinstate] }, { data: [reinstate] }], [{ data: [ROW] }, { data: [ROW] }]);
    await t.bell.notify(NOW);
    await t.bell.notify(NOW);
    // The same subject twice: PushService's dedup key keeps one row, so the replay tells no one again.
    expect(t.subjects()).toEqual(['audit-2', 'audit-2']);
  });

  it('a site currency reads its symbol; an unknown one its code', async () => {
    const events = [{ data: [EARN, { id: 'audit-2', entity_id: 'c2' }] }];
    const t = setup(events, [{ data: [{ ...ROW, amount: 12.5, currency: 'SAR' }, { ...ROW, id: 'c2', currency: 'GBP' }] }]);
    await t.bell.notify(NOW);
    const amounts = t.push.notifyProfiles.mock.calls.map((c) => (c[0] as { vars: { amount: string } }).vars.amount);
    expect(amounts).toEqual([signed('12.5', 'ر.س'), signed('50', 'GBP')]);
  });

  it('a database error is logged, never thrown, and tells no one', async () => {
    const t = setup([{ error: { message: 'boom' } }]);
    await expect(t.bell.notify(NOW)).resolves.toBeUndefined();
    expect(t.push.notifyProfiles).not.toHaveBeenCalled();
  });
});
