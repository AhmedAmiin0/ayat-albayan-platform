import { systemPermissionsOf } from '@ab/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PermissionResolver } from '@/common/auth/permissions';
import { inboxApp } from '@/modules/messaging/inbox/test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const HIT = {
  id: 'b0000000-0000-4000-8000-000000000001',
  created_at: '2026-10-01T10:00:00.123456+00:00',
  body: 'موعد درس الغد',
  media_name: null,
  template_key: null,
  direction: 'outbound',
  media_mime: null,
  phone_e164: '+966500000001',
  display_name: 'ولي أمر تجريبي',
};
const q = (text: string) => `/threads/search?q=${encodeURIComponent(text)}`;

// «بحث في كل الرسائل» (owner 2026-11-06, docs/37): GET /threads/search beside GET /threads/:phone.
describe('GET /threads/search', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.messageSearch.search.mockResolvedValue([HIT]);
  });

  it('is served by the search controller, not by GET :phone (no invalid-phone 400)', async () => {
    const res = await t.call({ method: 'GET', url: q('درس') });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      items: [{ ...pick(HIT), snippet: 'موعد درس الغد' }],
      next_cursor: null,
    });
    expect(t.queries.messages).not.toHaveBeenCalled();
  });

  it('fewer than 3 folded characters or a bad cursor is 400, with no search', async () => {
    for (const bad of [q('دَرْ'), q('  ab '), `${q('درس')}&cursor=x_y`]) {
      expect((await t.call({ method: 'GET', url: bad })).statusCode).toBe(400);
    }
    expect(t.messageSearch.search).not.toHaveBeenCalled();
  });

  it('a guardian (no inbox.read) is 403', async () => {
    expect((await t.call({ method: 'GET', url: q('درس'), token: 'guardian' })).statusCode).toBe(403);
    expect(t.messageSearch.search).not.toHaveBeenCalled();
  });
});

describe('GET /threads/search without inbox.read', () => {
  const resolve: PermissionResolver = async (user) =>
    (user.role ? systemPermissionsOf(user.role) : []).filter((p) => p !== 'inbox.read');
  let t: App;
  beforeAll(async () => {
    t = await inboxApp(resolve);
  });
  afterAll(() => t.app.close());

  it('an admin whose role lost inbox.read is 403', async () => {
    expect((await t.call({ method: 'GET', url: q('درس') })).statusCode).toBe(403);
    expect(t.messageSearch.search).not.toHaveBeenCalled();
  });
});

const pick = (h: typeof HIT) => ({
  id: h.id,
  created_at: h.created_at,
  phone_e164: h.phone_e164,
  display_name: h.display_name,
});
