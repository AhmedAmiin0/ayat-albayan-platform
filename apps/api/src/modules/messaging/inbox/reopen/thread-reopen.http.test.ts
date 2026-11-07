import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import { inboxApp } from '@/modules/messaging/inbox/test-app';

// POST /threads/:phone/reopen (owner 2026-11-07): kept for old app builds that call it on open,
// it answers the window state and sends NOTHING (the starter template goes on send only).

type App = Awaited<ReturnType<typeof inboxApp>>;
const URL = `/threads/${encodeURIComponent(PHONE)}/reopen`;
const FRESH = new Date(Date.now() - 3_600_000).toISOString();
const STALE = '2026-01-01T00:00:00Z';
const reopen = (token = 'admin') => t.call({ method: 'POST', url: URL, token });
let t: App;

describe('POST /threads/:phone/reopen (answer only)', () => {
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: STALE }));
  });

  const nothingSent = () => {
    expect(t.queries.enqueue).not.toHaveBeenCalled();
    expect(t.sender.kick).not.toHaveBeenCalled();
    expect(t.audit.record).not.toHaveBeenCalled();
  };

  it('a closed window: on_send, nothing queued, no audit (any hour, any role that sends)', async () => {
    for (const token of ['admin', 'sales']) {
      const res = await reopen(token);
      expect([res.statusCode, res.json()]).toEqual([200, { kapso_reopened: false, template: 'on_send' }]);
    }
    nothingSent();
  });

  it('an open window: window_open, nothing queued', async () => {
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: FRESH }));
    expect((await reopen()).json()).toEqual({ kapso_reopened: false, template: 'window_open' });
    nothingSent();
  });

  it('no thread for that phone: on_send, nothing queued', async () => {
    t.queries.thread.mockResolvedValue(null);
    expect((await reopen()).json()).toEqual({ kapso_reopened: false, template: 'on_send' });
    nothingSent();
  });

  it('a guardian (no inbox.send) is refused; a bad phone is 400', async () => {
    expect((await reopen('guardian')).statusCode).toBe(403);
    expect((await t.call({ method: 'POST', url: '/threads/abc/reopen' })).statusCode).toBe(400);
  });
});
