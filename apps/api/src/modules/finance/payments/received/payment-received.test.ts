import { describe, expect, it, vi } from 'vitest';
import { fakePushDb, flushPushes, okTickets, pushService } from '@/common/push/push.fakes';
import type { PushTransport } from '@/common/push/push.service';
import { paymentRow } from '@/modules/finance/subscriptions/money/money.fakes';
import { PaymentReceived, receivedOf, type ReceivedPayment } from './payment-received';
import type { PaymentReceivedRepo } from './payment-received.repo';

const PAYMENT: ReceivedPayment = {
  id: 'p1',
  kind: 'payment',
  amount: 50,
  currency: 'USD',
  studentId: 'st1',
  student: 'سهيلة',
};

function setup(owners: string[] = ['s1']) {
  const { db, writes } = fakePushDb([
    { id: 'a1', role: 'admin', push_tokens: ['ExponentPushToken[a1]'] },
    { id: 'a2', role: 'admin', push_tokens: [] },
    { id: 'a3', role: 'admin', push_tokens: [], disabled_at: '2026-11-01T00:00:00Z' },
    { id: 's1', role: 'sales', push_tokens: ['ExponentPushToken[s1]'] },
  ], { dedup: true });
  const repo = {
    adminIds: vi.fn(async () => ['a1', 'a2', 'a3']),
    ownerIds: vi.fn(async () => owners),
  };
  const transport = vi.fn<PushTransport>(async (m) => okTickets(m.length));
  const push = pushService(db, { transport });
  const received = new PaymentReceived(repo as unknown as PaymentReceivedRepo, push);
  const rows = () =>
    writes.filter((w) => w.op === 'upsert').map((w) => w.value as Record<string, unknown>);
  return { received, repo, rows, transport };
}

describe('PaymentReceived («تم استلام دفعة», payment_received)', () => {
  it('the admins and the student’s assistant: a bell row each and a device push', async () => {
    const s = setup();
    await s.received.notify({ payment: PAYMENT, recorderId: null });
    await flushPushes();
    expect(s.repo.ownerIds).toHaveBeenCalledWith('st1');
    expect(s.rows().map((r) => r.profile_id)).toEqual(['a1', 'a2', 's1']);
    expect(s.rows()[0]).toMatchObject({
      kind: 'payment_received',
      title: 'تم استلام دفعة',
      body: 'سهيلة: 50 USD',
      data: { kind: 'payment_received', studentId: 'st1' },
      dedup_key: 'payment_received:payment:p1:a1',
    });
    expect(s.transport).toHaveBeenCalledWith([expect.objectContaining({ to: 'ExponentPushToken[a1]' })]);
    expect(s.transport).toHaveBeenCalledWith([expect.objectContaining({ to: 'ExponentPushToken[s1]' })]);
  });

  it('who recorded it is not told; a disabled admin never is', async () => {
    const s = setup();
    await s.received.notify({ payment: PAYMENT, recorderId: 's1' });
    expect(s.rows().map((r) => r.profile_id)).toEqual(['a1', 'a2']);
  });

  it('no assistant → the admins only; `also` adds the payment link’s assistant', async () => {
    const s = setup([]);
    await s.received.notify({ payment: PAYMENT, recorderId: 'a2' });
    expect(s.rows().map((r) => r.profile_id)).toEqual(['a1']);
    await s.received.notify({ payment: { ...PAYMENT, id: 'p2' }, recorderId: null, also: ['s1'] });
    expect(s.rows().slice(1).map((r) => r.profile_id)).toEqual(['a1', 'a2', 's1']);
  });

  it('once per payment: a second notice of the same payment pushes nothing more', async () => {
    const s = setup();
    await s.received.notify({ payment: PAYMENT, recorderId: null });
    await s.received.notify({ payment: PAYMENT, recorderId: null });
    await flushPushes();
    expect(s.transport).toHaveBeenCalledTimes(2); // a1 and s1, the first time only
  });

  it('a refund tells nobody', async () => {
    const s = setup();
    await s.received.notify({ payment: { ...PAYMENT, kind: 'refund' }, recorderId: null });
    expect(s.repo.adminIds).not.toHaveBeenCalled();
    expect(s.rows()).toEqual([]);
  });

  it('never throws: a failed read is logged, `fire` returns at once', async () => {
    const s = setup();
    s.repo.adminIds.mockRejectedValue(new Error('db down'));
    const notice = { payment: PAYMENT, recorderId: null };
    await expect(s.received.notify(notice)).resolves.toBeUndefined();
    expect(() => {
      s.received.fire(notice);
    }).not.toThrow();
    await flushPushes();
    expect(s.rows()).toEqual([]);
  });

  it('receivedOf: what the family paid (the original amount and currency when converted)', () => {
    const row = paymentRow({ amount: 100, currency: 'SAR', original_amount: 1300, original_currency: 'EGP' });
    expect(receivedOf(row)).toEqual({
      id: row.id,
      kind: 'payment',
      amount: 1300,
      currency: 'EGP',
      studentId: row.subscription?.student_id,
      student: 'سهيلة',
    });
    expect(receivedOf(paymentRow())).toMatchObject({ amount: 145, currency: 'SAR' });
  });
});
