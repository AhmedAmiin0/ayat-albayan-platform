import { describe, expect, it, vi } from 'vitest';
import { fakePushDb, fakeWeb, flushPushes, okTickets, pushService } from './push.fakes';
import type { PushTransport } from './push.service';

// The Google sync's alerts (docs/24 §3): a bell row for the admins, no app push, no browser push.

describe('PushService bellOnly', () => {
  it('writes the bell row and sends nothing to devices or browsers', async () => {
    const { db, writes } = fakePushDb([{ id: 'a1', role: 'admin', push_tokens: ['ExponentPushToken[x]'] }]);
    const transport = vi.fn<PushTransport>(async (m) => okTickets(m.length));
    const { web, send } = fakeWeb();
    await pushService(db, { transport, web }).notifyAdmins('google_sync_alert', { subject: 'teacher:t1', vars: { reason: 'r' }, bellOnly: true });
    await flushPushes();
    const rows = writes.filter((w) => w.op === 'upsert').map((w) => w.value);
    expect(rows).toEqual([expect.objectContaining({ profile_id: 'a1', kind: 'google_sync_alert', dedup_key: 'google_sync_alert:teacher:t1:a1', title: 'مزامنة Google تحتاج إلى انتباه', body: 'r' })]);
    expect(transport).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
