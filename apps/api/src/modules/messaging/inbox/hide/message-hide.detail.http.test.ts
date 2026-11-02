import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import { inboxApp, NO_PEOPLE } from '@/modules/messaging/inbox/test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const URL = `/threads/${encodeURIComponent(PHONE)}`;
const hidden = {
  ...messageRow({
    id: 'h1',
    direction: 'inbound',
    status: 'delivered',
    template_key: null,
    template_params: null,
  }),
  body: 'رقم الحساب',
  media_mime: 'image/jpeg',
  hidden_at: '2026-10-30T11:00:00.000Z',
  hider: { full_name: 'سارة' },
};

// A hidden message reaches every staff reader as the placeholder; the preview and unread stay
// (v_threads).
describe('GET /threads/:phone with a message hidden from the platform', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.queries.thread.mockResolvedValue(threadRow({ last_body: 'رقم الحساب', unread_count: 1 }));
    t.queries.markInboundRead.mockResolvedValue([]);
    t.queries.people.mockResolvedValue(NO_PEOPLE);
    t.queries.messages.mockResolvedValue([hidden]);
    t.client.configured.mockReturnValue(true);
  });

  it('admin and sales get the placeholder with who and when, never the text or the file', async () => {
    for (const token of ['admin', 'sales']) {
      const body = (await t.call({ method: 'GET', url: URL, token })).json();
      const [m] = body.messages;
      expect(m).toMatchObject({
        id: 'h1',
        body: null,
        media_mime: null,
        forwardable: false,
        hidden: { by_name: 'سارة', at: '2026-10-30T11:00:00.000Z' },
      });
      expect(JSON.stringify(body.messages)).not.toContain('رقم الحساب');
      expect([body.thread.last_body, body.thread.unread_count]).toEqual(['رقم الحساب', 1]);
    }
  });
});
