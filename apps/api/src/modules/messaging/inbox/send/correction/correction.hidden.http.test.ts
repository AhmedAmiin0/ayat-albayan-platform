import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ar } from '@/common/infra/i18n/server-text';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import { inboxApp } from '@/modules/messaging/inbox/test-app';

// Follow-up to #694 (items 1-3): same_request is decided from the STORED row, so a correction
// hidden with «حذف من المنصة» (its view shows no body) or sent under an older wording of the
// prefix still answers an exact retry as sent: the client never sends a second «تصحيح».
type App = Awaited<ReturnType<typeof inboxApp>>;
const URL = `/threads/${encodeURIComponent(PHONE)}/text`;
const ORIGINAL = 'a0000000-0000-4000-8000-0000000000c1';
const REQ = 'c0000000-0000-4000-8000-0000000000c9';
const FRESH = new Date(Date.now() - 3_600_000).toISOString();
const stored = (over: object) =>
  messageRow({
    id: 'm9', corrects_id: ORIGINAL, template_key: null, template_params: null, ...over,
  });

describe('POST /threads/:phone/text: a correction retry against the stored row', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: FRESH }));
  });
  const retry = (text: string) =>
    t.call({
      method: 'POST',
      url: URL,
      token: 'admin',
      body: { text, clientRequestId: REQ, correctsId: ORIGINAL },
    });

  it('a hidden correction, the same text: same_request true (its view has no body)', async () => {
    const hidden = { hidden_at: '2026-11-07T09:00:00Z', hidden_by: 's1' };
    const own = { body: 'تصحيح: الخامسة', correction_text: 'الخامسة', ...hidden };
    t.queries.byDedupKey.mockResolvedValue(stored(own));
    const res = await retry('الخامسة');
    const answer = res.json();
    expect([answer.body, answer.replayed, answer.same_request]).toEqual([null, true, true]);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('a hidden correction from before the kept text: its stored body decides', async () => {
    const hidden = { hidden_at: '2026-11-07T09:00:00Z', body: 'تصحيح: الخامسة' };
    t.queries.byDedupKey.mockResolvedValue(stored(hidden));
    expect((await retry('الخامسة')).json().same_request).toBe(true);
    expect((await retry('السادسة')).json().same_request).toBe(false);
  });

  it.each([
    ['the exact retry', 'الخامسة', true],
    ['another text', 'السادسة', false],
  ])('sent under prefix A, admins reword it to B: %s → same_request %s', async (_, text, same) => {
    const live = ar.inbox.correction.prefix;
    ar.inbox.correction.prefix = 'ب: ';
    t.queries.byDedupKey.mockResolvedValue(stored({ body: 'أ: الخامسة', correction_text: 'الخامسة' }));
    const res = await retry(text);
    ar.inbox.correction.prefix = live;
    expect([res.json().replayed, res.json().same_request]).toEqual([true, same]);
  });
});
