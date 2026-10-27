import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messageRow } from '../../whatsapp/sender/sender.fakes';
import { PHONE, threadRow } from '../inbox.fakes';
import { inboxApp, NO_PEOPLE } from '../test-app';

// Opening a chat fast (owner 2026-10-27): two parallel stages, no write when nothing is unread, and
// Meta's read receipt never awaited — for the admin and the sales twin.

type App = Awaited<ReturnType<typeof inboxApp>>;
const URL = `/threads/${encodeURIComponent(PHONE)}`;
const inbound = (id: string, at: string) =>
  messageRow({ id, direction: 'inbound', status: 'delivered', template_key: null, template_params: null, body: 'سلام', created_at: at });

describe('GET /threads/:phone — the open chat', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.queries.thread.mockResolvedValue(threadRow({ unread_count: 0 }));
    t.queries.messages.mockResolvedValue([inbound('m1', '2026-10-02T08:01:00Z')]);
    t.queries.markInboundRead.mockResolvedValue([{ waMessageId: 'wamid.newest', line: 'notifications' }]);
    t.queries.people.mockResolvedValue(NO_PEOPLE);
    t.queries.lessons.mockResolvedValue([]);
    t.queries.familyTags.mockResolvedValue(new Map());
    t.client.configured.mockReturnValue(true);
    t.chatClient.configured.mockReturnValue(true);
    t.gate.open.mockResolvedValue(true);
  });

  it.each(['admin', 'sales'])('%s: nothing unread → no read stamp, no receipt (a poll of a read chat writes nothing)', async (token) => {
    const res = await t.call({ method: 'GET', url: URL, token });
    expect(res.statusCode).toBe(200);
    expect(t.queries.markInboundRead).not.toHaveBeenCalled();
    expect(t.gate.open).not.toHaveBeenCalled();
    expect(t.client.markRead).not.toHaveBeenCalled();
  });

  it.each(['admin', 'sales'])('%s: stage 1 reads the thread and the page side by side', async (token) => {
    let release: (v: ReturnType<typeof threadRow>) => void = () => undefined;
    t.queries.thread.mockReturnValue(new Promise((resolve) => (release = resolve)));
    const pending = t.call({ method: 'GET', url: URL, token });
    await vi.waitFor(() => expect(t.queries.messages).toHaveBeenCalled());
    release(threadRow({ unread_count: 0 }));
    expect((await pending).statusCode).toBe(200);
  });

  it.each(['admin', 'sales'])('%s: unread rows are stamped up to the newest shown; Meta’s receipt is never awaited', async (token) => {
    t.queries.thread.mockResolvedValue(threadRow({ unread_count: 2 }));
    t.client.markRead.mockReturnValue(new Promise(() => undefined)); // WhatsApp never answers
    const res = await t.call({ method: 'GET', url: URL, token });
    expect(res.statusCode).toBe(200);
    expect(t.queries.markInboundRead).toHaveBeenCalledWith(PHONE, expect.any(Date), '2026-10-02T08:01:00Z');
    const body = res.json();
    // The answer reads as if stamped first (as before the stages ran side by side).
    expect(body.thread.unread_count).toBe(0);
    expect(body.messages[0].read_at).not.toBeNull();
    await vi.waitFor(() => expect(t.client.markRead).toHaveBeenCalledWith('wamid.newest'));
  });

  it('a receipt that fails is logged, the chat still answers', async () => {
    t.queries.thread.mockResolvedValue(threadRow({ unread_count: 1 }));
    t.client.markRead.mockRejectedValue(new Error('131000'));
    expect((await t.call({ method: 'GET', url: URL })).statusCode).toBe(200);
  });

  it('an older page never stamps, even with unread rows', async () => {
    t.queries.thread.mockResolvedValue(threadRow({ unread_count: 3 }));
    await t.call({ method: 'GET', url: `${URL}?before=2026-10-02T08:00:00Z` });
    expect(t.queries.markInboundRead).not.toHaveBeenCalled();
  });

  it('a number with no message yet: who it is, its people and lessons; nothing to stamp', async () => {
    t.queries.thread.mockResolvedValue(null);
    t.queries.messages.mockResolvedValue([]);
    t.queries.known.mockResolvedValue({ guardian_id: 'g1', guardian_name: 'أم ياسمين', guardian_tz: 'Asia/Riyadh', lead_id: null, lead_status: null, teacher_id: null });
    const body = (await t.call({ method: 'GET', url: URL })).json();
    expect(body.thread).toBeNull();
    expect(t.queries.people).toHaveBeenCalledWith(expect.objectContaining({ guardian_id: 'g1' }));
    expect(t.queries.lessons).toHaveBeenCalledWith(expect.objectContaining({ guardian_id: 'g1' }), expect.any(Date));
    expect(t.queries.markInboundRead).not.toHaveBeenCalled();
  });
});
