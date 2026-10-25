import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messageRow } from '../whatsapp/sender/sender.fakes';
import { waHttpError } from '../whatsapp/templates/catalog/template.mapper';
import { PHONE, threadRow } from './inbox.fakes';
import { inboxApp } from './test-app';
import { ThreadQuotes } from './thread-quotes';

type App = Awaited<ReturnType<typeof inboxApp>>;
const URL = `/threads/${encodeURIComponent(PHONE)}`;
const REQ = 'c0000000-0000-4000-8000-000000000005';
const QUOTED = 'a0000000-0000-4000-8000-0000000000e1';
const FRESH = new Date(Date.now() - 3_600_000).toISOString();
const reply = (over: object = {}) => ({ method: 'POST' as const, url: `${URL}/text`, body: { text: 'نعم', clientRequestId: REQ, replyToMessageId: QUOTED, ...over } });

describe('«رد»: POST /threads/:phone/text with replyToMessageId (owner 2026-10-25)', () => {
  let t: App;
  let quotes: ThreadQuotes;
  beforeAll(async () => {
    t = await inboxApp();
    quotes = t.app.get(ThreadQuotes);
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: FRESH }));
    t.queries.enqueue.mockImplementation(async (row: object) => messageRow({ ...row, id: 'm9', template_key: null, template_params: null }));
    t.queries.get.mockResolvedValue(null);
  });

  it('stores our link to the quoted message and its wamid (the sender passes it as Meta context)', async () => {
    const target = vi.spyOn(quotes, 'target').mockResolvedValue({ reply_to_message_id: QUOTED, reply_to_wa_id: 'wamid.Q' });
    const res = await t.call(reply());
    expect(res.statusCode).toBe(201);
    expect(target).toHaveBeenCalledWith(PHONE, QUOTED, expect.any(Object));
    expect(t.queries.enqueue).toHaveBeenCalledWith(expect.objectContaining({ body: 'نعم', reply_to_message_id: QUOTED, reply_to_wa_id: 'wamid.Q' }));
  });

  it("another chat's message (or one without a wamid) is refused before anything is queued", async () => {
    vi.spyOn(quotes, 'target').mockRejectedValue(waHttpError('reply_not_in_thread', 400));
    const res = await t.call(reply());
    expect([res.statusCode, res.json().code]).toEqual([400, 'reply_not_in_thread']);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('outside the 24 h window the reply is 409 session_closed like any text, the quote not even read', async () => {
    const target = vi.spyOn(quotes, 'target');
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: '2026-01-01T00:00:00Z' }));
    const res = await t.call(reply());
    expect([res.statusCode, res.json().code]).toEqual([409, 'session_closed']);
    expect(target).not.toHaveBeenCalled();
  });

  it('a text without replyToMessageId carries no reply fields; a malformed id is 400', async () => {
    const target = vi.spyOn(quotes, 'target');
    await t.call(reply({ replyToMessageId: undefined }));
    expect(target).not.toHaveBeenCalled();
    expect(t.queries.enqueue).toHaveBeenCalledWith(expect.not.objectContaining({ reply_to_message_id: expect.anything() }));
    expect((await t.call(reply({ replyToMessageId: 'wamid.x' }))).statusCode).toBe(400);
  });
});
