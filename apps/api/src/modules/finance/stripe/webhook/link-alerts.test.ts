import { describe, expect, it, vi } from 'vitest';
import { fakePushDb, fakeWeb, flushPushes, okTickets, pushService } from '@/common/push/push.fakes';
import type { PushTransport } from '@/common/push/push.service';
import type { LinkRow } from '@/modules/finance/stripe/links/payment-links.repo';
import { LinkAlerts } from './link-alerts';

// payment_due's rule is ['bell', 'push']: a payment-link alert reaches the live devices too.

const LINK = {
  id: 'l1',
  created_by: 's1',
  student_id: 'st1',
  student: { id: 'st1', code: null, name: 'سهيلة' },
} as unknown as LinkRow;

function setup() {
  const { db, writes } = fakePushDb([
    { id: 's1', role: 'sales', push_tokens: ['ExponentPushToken[s]'] },
    { id: 'a1', role: 'admin', push_tokens: ['ExponentPushToken[a]'] },
  ]);
  const transport = vi.fn<PushTransport>(async (m) => okTickets(m.length));
  const { web, send } = fakeWeb();
  const alerts = new LinkAlerts(pushService(db, { transport, web }));
  const rows = () => writes.filter((w) => w.op === 'upsert').map((w) => w.value);
  return { alerts, transport, send, rows };
}

describe('LinkAlerts (payment_due) push to live devices', () => {
  it('paid: the link’s salesperson gets the bell row, the app push and the browser push', async () => {
    const s = setup();
    await s.alerts.paid(LINK, { amount: 50, currency: 'USD' });
    await flushPushes();
    expect(s.rows()).toEqual([expect.objectContaining({ profile_id: 's1', kind: 'payment_due' })]);
    expect(s.transport).toHaveBeenCalledWith([
      expect.objectContaining({ to: 'ExponentPushToken[s]' }),
    ]);
    expect(s.send).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({ tag: 'payment_due:payment_link:l1' }),
    );
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
