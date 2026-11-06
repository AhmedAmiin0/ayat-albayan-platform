import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { OwnNumbers } from '@/modules/messaging/numbers';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import { inboxApp } from '@/modules/messaging/inbox/test-app';

// GET /threads/sync (owner 2026-11-06, docs/43 §5): every changed row in the caller's scope, the
// rows it may not hold as `gone`, a keyset cursor. Example numbers only.
type App = Awaited<ReturnType<typeof inboxApp>>;
const OWN = '+966500000009';
const OTHER = '+966559999999';
const T = '2026-11-06T10:00:00.123456+00:00';
const id = (n: number) => `c0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const row = (n: number, over: Parameters<typeof messageRow>[0] = {}) =>
  messageRow({
    id: id(n),
    phone_e164: PHONE,
    template_key: null,
    template_params: null,
    body: `m${n}`,
    updated_at: T,
    ...over,
  });
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe('GET /threads/sync — the phone store delta', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(t.app.get(OwnNumbers), 'phones').mockResolvedValue(new Set([OWN]));
    t.sync.page.mockResolvedValue([]);
    t.queries.list.mockResolvedValue({ items: [threadRow()], total: 1 });
    t.queries.familyTags.mockResolvedValue(new Map());
    t.queries.unsupported.mockImplementation(async (rows: unknown[]) => rows);
    t.teacher.teacher.mockResolvedValue({
      id: 'tch-1',
      display_name_ar: 'أبرار',
      phone_e164: '+201001234567',
    });
    t.teacher.phones.mockResolvedValue([PHONE]);
    t.teacher.unread.mockResolvedValue(new Map());
  });

  it('admin: every chat, own numbers hidden; rows, their threads, cursor = last row', async () => {
    t.sync.page.mockResolvedValue([row(1), row(2)]);
    const res = await t.call({ method: 'GET', url: '/threads/sync' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(ids(body.messages)).toEqual([id(1), id(2)]);
    expect(body.messages[0]).toMatchObject({ updated_at: T, phone_e164: PHONE, body: 'm1' });
    expect(body.threads.map((x: { phone_e164: string }) => x.phone_e164)).toEqual([PHONE]);
    expect(body).toMatchObject({ gone: [], cursor: `${T}~${id(2)}`, has_more: false });
    expect(body.scope).toMatch(/^admin:/);
    expect(t.sync.page).toHaveBeenCalledWith(
      expect.objectContaining({ phones: null, hide: [OWN], limit: 200 }),
    );
    expect(t.queries.list).toHaveBeenCalledWith(
      expect.objectContaining({ phones: [PHONE], hide: [OWN] }),
    );
    expect(t.queries.markInboundRead).not.toHaveBeenCalled(); // a sync never stamps reads
  });

  it('sales: the signed-link templates are tombstones, never a bubble or a link', async () => {
    t.sync.page.mockResolvedValue([
      row(1, { template_key: 'lesson_join_link' }),
      row(2),
      row(3, { template_key: 'lesson_feedback_request' }),
    ]);
    const body = (await t.call({ method: 'GET', url: '/threads/sync', token: 'sales' })).json();
    expect(ids(body.messages)).toEqual([id(2)]);
    expect(body.gone).toEqual([id(1), id(3)]);
    expect(body.cursor).toBe(`${T}~${id(3)}`); // tombstones still move the cursor
    expect(body.scope).toMatch(/^sales:/);
    expect(t.sync.page).toHaveBeenCalledWith(
      expect.objectContaining({ phones: null, hide: [OWN] }),
    );
  });

  it('every role: reaction / edit / revoke marker rows are tombstones', async () => {
    t.sync.page.mockResolvedValue([
      row(1, { interactive_payload: { type: 'reaction', target: 'x', emoji: '👍' } }),
      row(2),
    ]);
    for (const token of ['admin', 'sales', 'teacher']) {
      const body = (await t.call({ method: 'GET', url: '/threads/sync', token })).json();
      expect([ids(body.messages), body.gone]).toEqual([[id(2)], [id(1)]]);
    }
  });

  it('teacher: only her scope phones are read; her list rows come from her own list', async () => {
    t.sync.page.mockResolvedValue([row(1)]);
    const body = (await t.call({ method: 'GET', url: '/threads/sync', token: 'teacher' })).json();
    expect(t.sync.page).toHaveBeenCalledWith(
      expect.objectContaining({ phones: [PHONE], hide: [OWN] }),
    );
    expect(ids(body.messages)).toEqual([id(1)]);
    expect(t.teacher.unread).toHaveBeenCalledWith('tch-1', [PHONE]);
    expect(body.scope).toMatch(/^teacher:/);
  });

  it('teacher with no families: no read at all, an empty page', async () => {
    t.teacher.phones.mockResolvedValue([]);
    const body = (await t.call({ method: 'GET', url: '/threads/sync', token: 'teacher' })).json();
    expect(t.sync.page).not.toHaveBeenCalled();
    expect(body).toMatchObject({
      messages: [],
      gone: [],
      threads: [],
      cursor: null,
      has_more: false,
    });
  });

  it('the scope key moves when the chats or own numbers change (the phone wipes)', async () => {
    const key = async (token: string) =>
      (await t.call({ method: 'GET', url: '/threads/sync', token })).json().scope;
    const before = await key('teacher');
    t.teacher.phones.mockResolvedValue([PHONE, OTHER]);
    expect(await key('teacher')).not.toBe(before);
    const admin = await key('admin');
    vi.spyOn(t.app.get(OwnNumbers), 'phones').mockResolvedValue(new Set());
    expect(await key('admin')).not.toBe(admin);
    expect(JSON.stringify(admin)).not.toContain(OWN.slice(1));
  });

  it('a guardian is 403; an unlinked teacher 404', async () => {
    expect(
      (await t.call({ method: 'GET', url: '/threads/sync', token: 'guardian' })).statusCode,
    ).toBe(403);
    t.teacher.teacher.mockResolvedValue(null);
    expect(
      (await t.call({ method: 'GET', url: '/threads/sync', token: 'unlinked' })).statusCode,
    ).toBe(404);
    expect(t.sync.page).not.toHaveBeenCalled();
  });
});
