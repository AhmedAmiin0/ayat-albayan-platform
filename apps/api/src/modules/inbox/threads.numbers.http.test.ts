import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '../../common/integrations/numbers-overlay';
import { messageRow } from '../whatsapp/sender/sender.fakes';
import { PHONE, threadRow } from './inbox.fakes';
import { CHAT_OFF, CHAT_TWO, NUMBERS } from './send-number.fakes';
import { inboxApp } from './test-app';

// H3 in module mode (docs/23c decision 6): the reply leaves from the number the family wrote to.

type App = Awaited<ReturnType<typeof inboxApp>>;
const URL = `/threads/${encodeURIComponent(PHONE)}`;
const REQ = 'c0000000-0000-4000-8000-000000000004';
const FRESH = new Date(Date.now() - 3_600_000).toISOString();
const OLD = '2026-01-01T00:00:00Z';
const TEXT = { method: 'POST' as const, url: `${URL}/text`, body: { text: 'أهلًا', clientRequestId: REQ } };

describe('inbox replies per number (module mode)', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  afterEach(() => setNumbersOverlay(null));
  beforeEach(() => {
    vi.resetAllMocks();
    setNumbersOverlay({ values: {}, numberIds: {}, numbers: NUMBERS });
    t.queries.enqueue.mockImplementation(async (row: object) => messageRow({ ...row, id: 'm9', template_key: null, template_params: null }));
    t.queries.get.mockResolvedValue(null);
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: OLD, last_notifications_inbound_at: OLD }));
  });
  const enqueued = () => t.queries.enqueue.mock.calls[0]?.[0] as Record<string, unknown>;

  it('queued with number_id + line = purpose of the newest open sendable window', async () => {
    t.queries.numberWindows.mockResolvedValue([{ numberId: CHAT_TWO.id, line: 'chat', lastInboundAt: FRESH }]);
    expect((await t.call(TEXT)).statusCode).toBe(201);
    expect(t.queries.numberWindows).toHaveBeenCalledWith(PHONE);
    expect(enqueued()).toMatchObject({ number_id: 'num-chat-2', line: 'chat', body: 'أهلًا' });
  });

  it('only a disabled number open → 503 line_not_configured; none open → 409; nothing queued', async () => {
    t.queries.numberWindows.mockResolvedValue([{ numberId: CHAT_OFF.id, line: 'chat', lastInboundAt: FRESH }]);
    const off = await t.call(TEXT);
    expect([off.statusCode, off.json().code]).toEqual([503, 'line_not_configured']);
    t.queries.numberWindows.mockResolvedValue([]);
    const shut = await t.call(TEXT);
    expect([shut.statusCode, shut.json().code]).toEqual([409, 'session_closed']);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('a failed windows read fails closed: 503, nothing queued', async () => {
    t.queries.numberWindows.mockRejectedValue(new Error('db down'));
    t.queries.thread.mockResolvedValue(threadRow({ last_chat_inbound_at: FRESH }));
    const res = await t.call(TEXT);
    expect([res.statusCode, res.json().code]).toEqual([503, 'line_not_configured']);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('legacy: the windows are never read and no number_id is queued', async () => {
    setNumbersOverlay(null);
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: FRESH, last_notifications_inbound_at: FRESH }));
    expect((await t.call(TEXT)).statusCode).toBe(201);
    expect(t.queries.numberWindows).not.toHaveBeenCalled();
    expect(enqueued()).not.toHaveProperty('number_id');
  });
});
