import { describe, expect, it, vi } from 'vitest';
import { fakePushDb, fakeWeb, flushPushes, okTickets, pushService } from '@/common/push/push.fakes';
import { lockScreenText } from './push.lock-screen';
import type { PushTransport } from '@/common/push/push.service';

// No money on a lock screen (owner 2026-10-25); the bell row, read after sign-in, keeps it.
describe('payment_received: the sum is masked on the lock screen', () => {
  it.each(['1,200 EGP', '145 SAR', '75 GBP', '٥٠٠ ج.م'])('%s leaves no digit', (amount) => {
    const shown = lockScreenText({ kind: 'payment_received', vars: { student: 'سهيلة أحمد', amount } });
    expect(shown.body).toBe('سهيلة: •••');
    expect(shown.body).not.toMatch(/[\d٠-٩]/);
  });

  it('devices get the masked text, the bell row the full sum', async () => {
    const { db, writes } = fakePushDb([{ id: 'a1', role: 'admin', push_tokens: ['ExponentPushToken[a]'] }]);
    const transport = vi.fn<PushTransport>(async (m) => okTickets(m.length));
    const { web, send } = fakeWeb();
    await pushService(db, { transport, web }).notifyProfiles({
      kind: 'payment_received',
      subject: 'payment:p1',
      vars: { student: 'سهيلة أحمد', amount: '1,200 EGP' },
      profileIds: ['a1'],
    });
    await flushPushes();
    expect(writes.find((w) => w.op === 'upsert')?.value).toMatchObject({ body: 'سهيلة أحمد: 1,200 EGP' });
    expect(transport.mock.calls[0]?.[0][0]?.body).toBe('سهيلة: •••');
    expect(send).toHaveBeenCalledWith('a1', expect.objectContaining({ body: 'سهيلة: •••' }));
  });

  it('payment_due keeps its {left} as before (a count, no sum)', () => {
    const shown = lockScreenText({ kind: 'payment_due', vars: { student: 'سهيلة أحمد', left: 'باقي 3 حلقات' } });
    expect(shown.body).toBe('باقة سهيلة: باقي 3 حلقات');
  });
});
