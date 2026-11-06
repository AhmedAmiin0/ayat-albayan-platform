import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NIL_UUID, SYNC_LIMIT_MAX } from '@ab/shared';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import { inboxApp } from '@/modules/messaging/inbox/test-app';

// GET /threads/sync keyset: (updated_at, id), the page cap, a re-ask from an earlier cursor.
type App = Awaited<ReturnType<typeof inboxApp>>;
const T = '2026-11-06T10:00:00.123456+00:00';
const id = (n: number) => `c0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const row = (n: number) =>
  messageRow({
    id: id(n),
    phone_e164: PHONE,
    template_key: null,
    template_params: null,
    body: `m${n}`,
    updated_at: T,
  });
const url = (q: string) => `/threads/sync?${q}`;
const since = (c: string) => `since=${encodeURIComponent(c)}`;

describe('GET /threads/sync — cursor and page cap', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.sync.page.mockResolvedValue([]);
    t.queries.list.mockResolvedValue({ items: [threadRow()], total: 1 });
    t.queries.familyTags.mockResolvedValue(new Map());
    t.queries.unsupported.mockImplementation(async (rows: unknown[]) => rows);
  });

  it('a first sync starts before every row; the cursor is passed through untouched', async () => {
    await t.call({ method: 'GET', url: '/threads/sync' });
    expect(t.sync.page).toHaveBeenLastCalledWith(
      expect.objectContaining({ after: { at: '1970-01-01T00:00:00+00:00', id: NIL_UUID } }),
    );
    await t.call({ method: 'GET', url: url(since(`${T}~${id(4)}`)) });
    expect(t.sync.page).toHaveBeenLastCalledWith(
      expect.objectContaining({ after: { at: T, id: id(4) } }),
    );
  });

  it('page cap: limit + 1 read, only limit rows sent, has_more, cursor = the last sent row', async () => {
    t.sync.page.mockResolvedValue([row(1), row(2), row(3)]);
    const body = (await t.call({ method: 'GET', url: url('limit=2') })).json();
    expect(t.sync.page).toHaveBeenCalledWith(expect.objectContaining({ limit: 2 }));
    expect(body.messages.map((m: { id: string }) => m.id)).toEqual([id(1), id(2)]);
    expect([body.has_more, body.cursor]).toEqual([true, `${T}~${id(2)}`]);
  });

  it('400 past the hard cap, on a bare time or a bad id', async () => {
    for (const q of [
      `limit=${SYNC_LIMIT_MAX + 1}`,
      since(T),
      since(`${T}~nope`),
      since(`yesterday~${id(1)}`),
    ])
      expect((await t.call({ method: 'GET', url: url(q) })).statusCode).toBe(400);
  });

  it('nothing changed: the asked cursor comes back (the phone keeps its mark)', async () => {
    const c = `${T}~${id(7)}`;
    const body = (await t.call({ method: 'GET', url: url(since(c)) })).json();
    expect(body).toMatchObject({ messages: [], gone: [], threads: [], cursor: c, has_more: false });
    expect(t.queries.list).not.toHaveBeenCalled();
  });

  it('a re-ask from an earlier cursor (the 10 s overlap) answers the same rows: upsert by id', async () => {
    t.sync.page.mockResolvedValue([row(1), row(2)]);
    const first = (
      await t.call({ method: 'GET', url: url(since(`2026-11-06T09:59:50.123Z~${NIL_UUID}`)) })
    ).json();
    const again = (
      await t.call({ method: 'GET', url: url(since(`2026-11-06T09:59:50.123Z~${NIL_UUID}`)) })
    ).json();
    expect(again).toEqual(first);
  });

  it('/threads/sync is not read as a phone (GET /threads/:phone)', async () => {
    await t.call({ method: 'GET', url: '/threads/sync' });
    expect(t.queries.thread).not.toHaveBeenCalled();
    expect(t.sync.page).toHaveBeenCalledTimes(1);
  });
});
