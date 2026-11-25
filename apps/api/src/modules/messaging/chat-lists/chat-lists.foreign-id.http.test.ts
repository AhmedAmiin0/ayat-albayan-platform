import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { inboxApp } from '@/modules/messaging/inbox/test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const LIST = '0c000000-0000-4000-8000-0000000000f1';
const PHONE = encodeURIComponent('+966501234567');
const CALLS = [
  { method: 'PATCH' as const, url: `/chat-lists/${LIST}`, body: { name: 'مدفوع' } },
  { method: 'DELETE' as const, url: `/chat-lists/${LIST}` },
  { method: 'PUT' as const, url: `/chat-lists/${LIST}/threads/${PHONE}` },
  { method: 'DELETE' as const, url: `/chat-lists/${LIST}/threads/${PHONE}` },
];

// Lists are one academy-wide set for the admin and sales (docs/22 §3), so no staff login owns a
// list; the scoped logins that are not staff must never reach one by id.
describe('chat-list id routes with a list the caller cannot reach', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => vi.resetAllMocks());

  const SCOPED = ['teacher', 'unlinked', 'guardian'];
  it.each(SCOPED)('%s: 403 on every list route, nothing touched', async (token) => {
    for (const call of CALLS) {
      const res = await t.call({ ...call, token });
      expect([call.method, call.url, res.statusCode]).toEqual([call.method, call.url, 403]);
    }
    const touched = [t.lists.one, t.lists.rename, t.lists.remove, t.lists.add, t.lists.drop];
    expect(touched.map((f) => f.mock.calls.length)).toEqual([0, 0, 0, 0, 0]);
  });

  it('sales with a malformed list id is 404 list_not_found, nothing touched', async () => {
    const body = { name: 'س' };
    const res = await t.call({ method: 'PATCH', url: '/chat-lists/nope', token: 'sales', body });
    expect([res.statusCode, res.json().code]).toEqual([404, 'list_not_found']);
    expect(t.lists.rename).not.toHaveBeenCalled();
  });
});
