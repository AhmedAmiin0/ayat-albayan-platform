import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import { inboxApp, NO_PEOPLE } from '@/modules/messaging/inbox/test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const HIT = 'b0000000-0000-4000-8000-000000000042';
const URL = `/threads/${encodeURIComponent(PHONE)}`;
const ME = { id: 'tch-1', display_name_ar: 'معلمة تجريبية', phone_e164: '+201001234567' };

// The window around a search hit (docs/37 NEW 3): never the first page, so for every role no read
// stamp, no Meta receipt, no people, lessons or lists (the live chat, still mounted, does those).
describe('GET /threads/:phone?around=', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.queries.thread.mockResolvedValue(threadRow({ unread_count: 3, guardian_id: 'g1' }));
    t.queries.messages.mockResolvedValue([messageRow({ id: HIT, body: 'درس', template_key: null })]);
    t.queries.familyTags.mockResolvedValue(new Map());
    t.queries.people.mockResolvedValue(NO_PEOPLE);
    t.teacher.teacher.mockImplementation(async (id: string) => (id === 't1' ? ME : null));
    t.teacher.phones.mockResolvedValue([PHONE]);
  });

  for (const token of ['admin', 'sales', 'teacher']) {
    it(`${token}: the window is read, nothing stamped, no people / lessons / lists`, async () => {
      const res = await t.call({ method: 'GET', url: `${URL}?around=${HIT}`, token });
      expect(res.statusCode).toBe(200);
      expect(res.json().messages.map((m: { id: string }) => m.id)).toEqual([HIT]);
      const read = expect.objectContaining({ around: HIT, limit: 50 });
      expect(t.queries.messages).toHaveBeenCalledWith(read);
      expect(t.queries.markInboundRead).not.toHaveBeenCalled();
      expect(t.teacher.stampRead).not.toHaveBeenCalled();
      expect(t.queries.people).not.toHaveBeenCalled();
      expect(t.queries.lessons).not.toHaveBeenCalled();
      expect(t.lists.listsOf).not.toHaveBeenCalled();
    });
  }

  it('around beside before / after, or before_id without before, is 400 with no read', async () => {
    const at = '2026-10-02T08:00:00Z';
    const bad = [`around=${HIT}&before=${at}`, `before_id=${HIT}`, `around=${HIT}&after=${at}`];
    for (const q of bad) {
      expect((await t.call({ method: 'GET', url: `${URL}?${q}` })).statusCode).toBe(400);
    }
    expect(t.queries.messages).not.toHaveBeenCalled();
  });

  it('before + before_id reach the page read (the compound keyset)', async () => {
    const at = '2026-10-02T08:00:00.123456Z';
    await t.call({ method: 'GET', url: `${URL}?before=${encodeURIComponent(at)}&before_id=${HIT}` });
    const read = expect.objectContaining({ before: at, before_id: HIT });
    expect(t.queries.messages).toHaveBeenCalledWith(read);
  });
});
