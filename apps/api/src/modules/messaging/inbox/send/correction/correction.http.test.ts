import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import { ADMIN, inboxApp } from '@/modules/messaging/inbox/test-app';
import { ThreadQuotes } from '@/modules/messaging/inbox/threads/thread-quotes';
import { CorrectionRepo } from './correction.repo';
import { target } from './correction.fakes';

type App = Awaited<ReturnType<typeof inboxApp>>;
const URL = `/threads/${encodeURIComponent(PHONE)}/text`;
const REQ = 'c0000000-0000-4000-8000-0000000000c7';
const ORIGINAL = 'a0000000-0000-4000-8000-0000000000c1';
const FRESH = new Date(Date.now() - 3_600_000).toISOString();
const correct = (token = 'admin') => ({
  method: 'POST' as const,
  url: URL,
  token,
  body: { text: ' الحلقة الساعة الخامسة ', clientRequestId: REQ, correctsId: ORIGINAL },
});

describe('«تعديل» = a correction: POST /threads/:phone/text with correctsId (owner 2026-11-07)', () => {
  let t: App;
  let repo: CorrectionRepo;
  let quotes: ThreadQuotes;
  beforeAll(async () => {
    t = await inboxApp();
    repo = t.app.get(CorrectionRepo);
    quotes = t.app.get(ThreadQuotes);
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: FRESH }));
    t.queries.enqueue.mockImplementation(async (row: object) =>
      messageRow({ ...row, id: 'm9', template_key: null, template_params: null }),
    );
    t.queries.get.mockResolvedValue(null);
    vi.spyOn(quotes, 'target').mockResolvedValue({
      reply_to_message_id: ORIGINAL,
      reply_to_wa_id: 'wamid.O',
    });
  });

  it('queues ONE new text «تصحيح: …» replying to the original (its wamid), linked by corrects_id', async () => {
    vi.spyOn(repo, 'target').mockResolvedValue(target({ created_by: 's9' }));
    const res = await t.call(correct());
    expect(res.statusCode).toBe(201);
    expect(quotes.target).toHaveBeenCalledWith(PHONE, ORIGINAL, expect.any(Object));
    expect(t.queries.enqueue).toHaveBeenCalledTimes(1);
    expect(t.queries.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'تصحيح: الحلقة الساعة الخامسة',
        corrects_id: ORIGINAL,
        reply_to_message_id: ORIGINAL,
        reply_to_wa_id: 'wamid.O',
        created_by: ADMIN.id,
        dedup_key: `admin:${PHONE}:${REQ}`,
      }),
    );
    expect(t.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'thread_correction' }),
    );
  });

  it('a salesperson corrects only her own text: 403 not_your_message, nothing queued', async () => {
    vi.spyOn(repo, 'target').mockResolvedValue(target({ created_by: ADMIN.id }));
    const res = await t.call(correct('sales'));
    expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_message']);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
    vi.spyOn(repo, 'target').mockResolvedValue(target({ created_by: 's1' }));
    expect((await t.call(correct('sales'))).statusCode).toBe(201);
  });

  it('another chat, a template, a file, a hidden message or a correction is refused before anything is queued', async () => {
    const cases = [
      [target({ phone_e164: '+966559999999' }), 400, 'correction_not_in_thread'],
      [null, 400, 'correction_not_in_thread'],
      [target({ template_key: 'lesson_reminder' }), 400, 'not_correctable'],
      [target({ media_mime: 'image/jpeg' }), 400, 'not_correctable'],
      [target({ hidden_at: FRESH }), 400, 'not_correctable'],
      [target({ corrects_id: 'a0000000-0000-4000-8000-0000000000c0' }), 400, 'not_correctable'],
    ] as const;
    for (const [row, status, code] of cases) {
      vi.spyOn(repo, 'target').mockResolvedValue(row);
      const res = await t.call(correct());
      expect([res.statusCode, res.json().code]).toEqual([status, code]);
    }
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('outside the window it follows the text rule (here: a non-Kapso line, 409), nothing queued', async () => {
    vi.spyOn(repo, 'target').mockResolvedValue(target());
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: '2026-01-01T00:00:00Z' }));
    const res = await t.call(correct());
    expect([res.statusCode, res.json().code]).toEqual([409, 'session_closed']);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });
});
