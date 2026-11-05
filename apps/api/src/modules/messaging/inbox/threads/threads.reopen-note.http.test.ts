import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import { inboxApp, NO_PEOPLE } from '@/modules/messaging/inbox/test-app';

// Merge-gate review 2026-11-05: the composer's «after the window» note (try_after_window) only
// while the reopen template is usable for the Kapso chat line; else nothing would be sent.

type App = Awaited<ReturnType<typeof inboxApp>>;
const URL = `/threads/${encodeURIComponent(PHONE)}`;
const KAPSO = {
  WA_CHAT_PROVIDER: 'kapso',
  WA_CHAT_PHONE_NUMBER_ID: 'c-phone',
  WA_CHAT_WABA_ID: 'c-waba',
  KAPSO_API_BASE: 'http://wa-stub.test/kapso',
  KAPSO_API_KEY: 'kapso-key-fake',
};

describe('GET /threads, /threads/:phone — try_after_window', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.resetAllMocks();
    for (const [k, v] of Object.entries(KAPSO)) vi.stubEnv(k, v);
    t.queries.thread.mockResolvedValue(threadRow({ unread_count: 0 }));
    t.queries.list.mockResolvedValue({ items: [threadRow()], total: 1 });
    t.queries.unsupported.mockImplementation(async (rows: unknown[]) => rows);
    t.queries.messages.mockResolvedValue([]);
    t.queries.people.mockResolvedValue(NO_PEOPLE);
    t.queries.lessons.mockResolvedValue([]);
    t.queries.familyTags.mockResolvedValue(new Map());
  });

  it.each(['admin', 'sales'])('%s: the reopen template usable → offered', async (token) => {
    t.reopenRequest.usable.mockResolvedValue(true);
    const one = (await t.call({ method: 'GET', url: URL, token })).json();
    expect(one.thread.try_after_window).toBe(true);
    const list = (await t.call({ method: 'GET', url: '/threads', token })).json();
    expect(list.items[0].try_after_window).toBe(true);
  });

  it.each(['admin', 'sales'])('%s: not usable (unset, not approved) → no note', async (token) => {
    t.reopenRequest.usable.mockResolvedValue(false);
    const one = (await t.call({ method: 'GET', url: URL, token })).json();
    expect(one.thread).not.toHaveProperty('try_after_window');
  });

  it('a failed settings read drops the note only: the chat still opens', async () => {
    t.reopenRequest.usable.mockRejectedValue(new Error('settings read failed'));
    const res = await t.call({ method: 'GET', url: URL, token: 'admin' });
    expect(res.statusCode).toBe(200);
    expect(res.json().thread).not.toHaveProperty('try_after_window');
  });
});
