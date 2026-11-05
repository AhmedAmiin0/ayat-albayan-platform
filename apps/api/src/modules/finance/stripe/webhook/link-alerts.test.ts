import { describe, expect, it, vi } from 'vitest';
import { fakePushDb, fakeWeb, flushPushes, okTickets, pushService } from '@/common/push/push.fakes';
import type { PushTransport } from '@/common/push/push.service';
import { PaymentReceived, type PaymentReceivedRepo } from '@/modules/finance/payments';
import type { LinkRow } from '@/modules/finance/stripe/links/payment-links.repo';
import { LinkAlerts } from './link-alerts';

// A paid link is «تم استلام دفعة» (payment_received, bell + push); the admins' alerts stay payment_due.

const LINK = {
  id: 'l1',
  created_by: 's1',
  student_id: 'st1',
  student: { id: 'st1', code: null, name: 'سهيلة' },
} as unknown as LinkRow;

function setup(owners: string[] = []) {
  const { db, writes } = fakePushDb([
    { id: 's1', role: 'sales', push_tokens: ['ExponentPushToken[s]'] },
    { id: 's2', role: 'sales', push_tokens: [] },
    { id: 'a1', role: 'admin', push_tokens: ['ExponentPushToken[a]'] },
  ]);
  const transport = vi.fn<PushTransport>(async (m) => okTickets(m.length));
  const { web, send } = fakeWeb();
  const push = pushService(db, { transport, web });
  const repo = { adminIds: vi.fn(async () => ['a1']), ownerIds: vi.fn(async () => owners) };
  const received = new PaymentReceived(repo as unknown as PaymentReceivedRepo, push);
  const alerts = new LinkAlerts(push, received);
  const rows = () =>
    writes.filter((w) => w.op === 'upsert').map((w) => w.value as Record<string, unknown>);
  return { alerts, transport, send, rows };
}

describe('LinkAlerts', () => {
  it('paid: the admins, the student’s assistant and the link’s assistant, row + device push', async () => {
    const s = setup(['s2']);
    await s.alerts.paid(LINK, { id: 'p1', amount: 50, currency: 'USD' });
    await flushPushes();
    const told = s.rows().map((r) => `${String(r.profile_id)} ${String(r.kind)}`);
    expect(told.sort()).toEqual(['a1 payment_received', 's1 payment_received', 's2 payment_received']);
    expect(s.rows()[0]).toMatchObject({ body: 'سهيلة: 50 USD', data: { studentId: 'st1', kind: 'payment_received' } });
    expect(s.transport).toHaveBeenCalledWith([expect.objectContaining({ to: 'ExponentPushToken[s]' })]);
    expect(s.send).toHaveBeenCalledWith('s1', expect.objectContaining({ tag: 'payment_received:payment:p1' }));
  });

  it('admins: every admin gets the row and the device push, nobody else', async () => {
    const s = setup();
    await s.alerts.admins({ subject: 'stripe_dispute:d1', title: 'نزاع', text: 'x', link: LINK });
    await flushPushes();
    expect(s.rows()).toEqual([expect.objectContaining({ profile_id: 'a1', kind: 'payment_due' })]);
    expect(s.transport).toHaveBeenCalledWith([
      expect.objectContaining({ to: 'ExponentPushToken[a]' }),
    ]);
  });
});
