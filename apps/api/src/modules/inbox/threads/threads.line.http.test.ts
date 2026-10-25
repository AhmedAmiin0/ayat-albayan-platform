import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messageRow } from '../../whatsapp/sender/sender.fakes';
import { templateRow } from '../../whatsapp/whatsapp.fakes';
import { PHONE, threadRow } from '../inbox.fakes';
import { inboxApp } from '../test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const URL = `/threads/${encodeURIComponent(PHONE)}`;
const REQ = 'c0000000-0000-4000-8000-000000000003';
const FRESH = new Date(Date.now() - 3_600_000).toISOString();
const TEXT = { method: 'POST' as const, url: `${URL}/text`, body: { text: 'أهلًا', clientRequestId: REQ } };

/** The chat line can SEND (lineEnvs(env).chat non-null), read per request (docs/12 §13.16 item 5). */
function chatConfigured(): void {
  vi.stubEnv('WA_API_BASE', 'http://wa-stub.test');
  vi.stubEnv('WA_CHAT_PHONE_NUMBER_ID', 'chat-phone');
  vi.stubEnv('WA_CHAT_WABA_ID', 'chat-waba');
  vi.stubEnv('WA_ACCESS_TOKEN', 'token');
}

describe('two lines on the inbox (docs/12 §13.3, §13.7; R-LEAD-02, R-MSG-05)', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.resetAllMocks();
    t.client.configured.mockReturnValue(true);
    t.chatClient.configured.mockReturnValue(true);
    t.queries.markInboundRead.mockResolvedValue([]);
    t.queries.familyTags.mockResolvedValue(new Map());
    t.queries.messages.mockResolvedValue([]);
    t.queries.enqueue.mockImplementation(async (row: object) => messageRow({ ...row, id: 'm9', template_key: null, template_params: null }));
    t.queries.get.mockResolvedValue(null);
    t.templates.get.mockResolvedValue(templateRow());
  });
  /** One inbound on `line` at `at` (null = history: the notifications window). */
  const thread = (line: 'chat' | 'notifications' | null, at = FRESH) =>
    t.queries.thread.mockResolvedValue(
      threadRow({
        last_inbound_at: at,
        last_inbound_line: line,
        last_chat_inbound_at: line === 'chat' ? at : null,
        last_notifications_inbound_at: line === 'chat' ? null : at,
      }),
    );
  const enqueued = () => t.queries.enqueue.mock.calls[0]?.[0] as Record<string, unknown>;

  it('GET /threads and /threads/:phone carry last_inbound_line and reply_line', async () => {
    t.queries.list.mockResolvedValue({ items: [threadRow({ last_inbound_line: 'chat' }), threadRow({ phone_e164: '+966551112222' })], total: 2 });
    const items = (await t.call({ method: 'GET', url: '/threads' })).json().items;
    expect(items.map((i: { last_inbound_line: unknown }) => i.last_inbound_line)).toEqual(['chat', null]);
    thread('chat');
    expect((await t.call({ method: 'GET', url: URL })).json().thread).toMatchObject({ last_inbound_line: 'chat', reply_line: 'chat' });
  });

  it('H3 chat, then a reminder tap on notifications a minute later: the reply still leaves via chat', async () => {
    chatConfigured();
    const tap = new Date(Date.parse(FRESH) + 60_000).toISOString();
    const row = { last_inbound_at: tap, last_inbound_line: 'notifications' as const, last_chat_inbound_at: FRESH, last_notifications_inbound_at: tap };
    t.queries.thread.mockResolvedValue(threadRow(row));
    expect((await t.call(TEXT)).statusCode).toBe(201);
    expect(enqueued()).toMatchObject({ line: 'chat' });
    expect((await t.call({ method: 'GET', url: URL })).json().thread).toMatchObject({ last_inbound_line: 'notifications', reply_line: 'chat' });
  });

  it('H3 the chat window closed, the notifications one open: notifications', async () => {
    chatConfigured();
    const row = { last_inbound_line: 'notifications' as const, last_chat_inbound_at: '2026-01-01T00:00:00Z', last_notifications_inbound_at: FRESH };
    t.queries.thread.mockResolvedValue(threadRow({ ...row, last_inbound_at: FRESH }));
    expect((await t.call(TEXT)).statusCode).toBe(201);
    expect(enqueued()).toMatchObject({ line: 'notifications' });
  });

  it('H3 a thread whose newest inbound is on chat: the text is queued with line chat', async () => {
    chatConfigured();
    thread('chat');
    expect((await t.call(TEXT)).statusCode).toBe(201);
    expect(enqueued()).toMatchObject({ line: 'chat', body: 'أهلًا', dedup_key: `admin:${PHONE}:${REQ}` });
  });

  it('H3 a notifications thread is stamped notifications; a single line queues no line key', async () => {
    chatConfigured();
    thread('notifications');
    expect((await t.call(TEXT)).statusCode).toBe(201);
    expect(enqueued()).toMatchObject({ line: 'notifications' });
    t.queries.enqueue.mockClear();
    vi.stubEnv('WA_CHAT_WABA_ID', '');
    thread('notifications');
    expect((await t.call(TEXT)).statusCode).toBe(201);
    expect(enqueued()).not.toHaveProperty('line');
  });

  it('H3 409 session_closed after 24 h is unchanged, on either line', async () => {
    chatConfigured();
    for (const line of ['chat', null] as const) {
      thread(line, '2026-01-01T00:00:00Z');
      const res = await t.call(TEXT);
      expect([res.statusCode, res.json().code]).toEqual([409, 'session_closed']);
    }
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('H3 a chat thread while the chat line is not configured → 503 line_not_configured, nothing queued', async () => {
    vi.stubEnv('WA_CHAT_PHONE_NUMBER_ID', '');
    vi.stubEnv('WA_CHAT_WABA_ID', '');
    thread('chat');
    const res = await t.call(TEXT);
    expect([res.statusCode, res.json().code]).toEqual([503, 'line_not_configured']);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
    expect(t.sender.kick).not.toHaveBeenCalled();
  });

  it('H4 a template on a chat thread is queued without a line (the sender sends it from notifications)', async () => {
    chatConfigured();
    thread('chat');
    t.queries.enqueue.mockImplementation(async (row: object) => messageRow({ ...row, id: 'm9' }));
    const params = { '1': 'ياسمين', '2': 'الأحد 16:00', button: 'ayat-room' };
    const res = await t.call({ method: 'POST', url: `${URL}/template`, body: { key: 'booking_confirmation', params, clientRequestId: REQ } });
    expect(res.statusCode).toBe(201);
    expect(enqueued()).toMatchObject({ template_key: 'booking_confirmation' });
    expect(enqueued()).not.toHaveProperty('line');
  });
});
