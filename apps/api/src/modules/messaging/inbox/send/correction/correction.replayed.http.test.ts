import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import { inboxApp } from '@/modules/messaging/inbox/test-app';
import { ThreadQuotes } from '@/modules/messaging/inbox/threads/thread-quotes';
import { CorrectionRepo } from './correction.repo';
import { target } from './correction.fakes';

// Review of PR #694 (2): the text answer says whether its request id was a replay (the FIRST row
// came back, nothing new queued), so a client never takes an earlier row for its correction.
type App = Awaited<ReturnType<typeof inboxApp>>;
const URL = `/threads/${encodeURIComponent(PHONE)}/text`;
const ORIGINAL = 'a0000000-0000-4000-8000-0000000000c1';
const FRESH = new Date(Date.now() - 3_600_000).toISOString();
const body = { text: 'الخامسة', clientRequestId: 'c0000000-0000-4000-8000-0000000000c8' };

describe('POST /threads/:phone/text answers `replayed`', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: FRESH }));
    t.queries.get.mockResolvedValue(null);
    vi.spyOn(t.app.get(CorrectionRepo), 'target').mockResolvedValue(target());
    vi.spyOn(t.app.get(ThreadQuotes), 'target').mockResolvedValue({
      reply_to_message_id: ORIGINAL,
      reply_to_wa_id: 'wamid.O',
    });
  });

  it.each([
    ['a new row', false],
    ['the first row of this request id', true],
  ])('%s: replayed %s (a replay is not audited again)', async (_, replayed) => {
    t.queries.enqueue.mockImplementation(async (row: object) => ({
      ...messageRow({ ...row, id: 'm9', template_key: null, template_params: null }),
      replayed,
    }));
    const res = await t.call({ method: 'POST', url: URL, token: 'admin', body: { ...body, correctsId: ORIGINAL } });
    expect([res.statusCode, res.json().replayed]).toEqual([201, replayed]);
    expect(t.audit.record).toHaveBeenCalledTimes(replayed ? 0 : 1);
  });
});
