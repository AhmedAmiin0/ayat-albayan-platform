import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messageRow } from '../../whatsapp/sender/sender.fakes';
import { PHONE, threadRow } from '../inbox.fakes';
import { inboxApp } from '../test-app';

// GET /threads/:phone?after= (owner 2026-10-27, «delta refresh»): only newer rows plus the pending
// statuses, two reads, nothing written unless a new inbound arrived; every caller's scope kept.

type App = Awaited<ReturnType<typeof inboxApp>>;
const AFTER = '2026-10-27T10:00:00.000Z';
const URL = `/threads/${encodeURIComponent(PHONE)}?after=${encodeURIComponent(AFTER)}`;
const SENT = 'c0000000-0000-4000-8000-0000000000a1';
const row = (id: string, over: Parameters<typeof messageRow>[0] = {}) =>
  messageRow({ id, template_key: null, template_params: null, body: id, created_at: '2026-10-27T10:00:30Z', ...over });
const inbound = (id: string, over: Parameters<typeof messageRow>[0] = {}) => row(id, { direction: 'inbound', status: 'delivered', ...over });

describe('GET /threads/:phone?after= — the delta refresh', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.delta.newer.mockResolvedValue([]);
    t.delta.pending.mockResolvedValue([]);
    t.queries.thread.mockResolvedValue(threadRow({ unread_count: 1, last_inbound_at: '2026-10-27T10:00:30Z' }));
    t.queries.markInboundRead.mockResolvedValue([{ waMessageId: 'wamid.x', line: 'notifications' }]);
    t.gate.open.mockResolvedValue(true);
    t.client.configured.mockReturnValue(true);
  });

  it('nothing new: two reads, nothing written, no thread', async () => {
    t.delta.pending.mockResolvedValue([row(SENT, { status: 'sent' })]);
    const res = await t.call({ method: 'GET', url: `${URL}&pending=${SENT}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ messages: [], has_more: false, pending: [{ id: SENT, status: 'sent' }] });
    expect(res.json().thread).toBeUndefined();
    expect(t.delta.pending).toHaveBeenCalledWith(expect.objectContaining({ phone: PHONE, ids: [SENT] }));
    expect(t.queries.thread).not.toHaveBeenCalled();
    expect(t.queries.markInboundRead).not.toHaveBeenCalled();
    expect(t.queries.messages).not.toHaveBeenCalled(); // never the whole page
  });

  it('newer rows only (with the WhatsApp-second overlap), oldest → newest; a gap is flagged', async () => {
    t.delta.newer.mockResolvedValue([row('m3', { created_at: '2026-10-27T10:00:50Z' }), row('m2', { created_at: '2026-10-27T10:00:40Z' })]);
    const body = (await t.call({ method: 'GET', url: `${URL}&limit=1` })).json();
    expect(body.messages.map((m: { id: string }) => m.id)).toEqual(['m3']);
    expect(body.has_more).toBe(true);
    expect(t.delta.newer).toHaveBeenCalledWith({ phone: PHONE, after: '2026-10-27T09:58:00.000Z', limit: 1 });
  });

  it('a pending row already among the new rows comes once', async () => {
    t.delta.newer.mockResolvedValue([row('m2')]);
    t.delta.pending.mockResolvedValue([row('m2')]);
    const body = (await t.call({ method: 'GET', url: URL })).json();
    expect([body.messages.length, body.pending.length]).toEqual([1, 0]);
  });

  it('a new unread inbound: the read stamp and the window (unread 0 once stamped); receipt in the background', async () => {
    t.delta.newer.mockResolvedValue([inbound('in1')]);
    const body = (await t.call({ method: 'GET', url: URL })).json();
    expect(t.queries.markInboundRead).toHaveBeenCalledWith(PHONE, expect.any(Date), '2026-10-27T10:00:30Z');
    expect(body.thread).toMatchObject({ unread_count: 0, last_inbound_at: '2026-10-27T10:00:30Z' });
    expect(body.messages[0].read_at).not.toBeNull();
    await vi.waitFor(() => expect(t.client.markRead).toHaveBeenCalledWith('wamid.x'));
  });

  it('an inbound in the overlap the admin already read: no write, no thread', async () => {
    t.delta.newer.mockResolvedValue([inbound('old', { created_at: '2026-10-27T09:59:00Z', read_at: '2026-10-27T09:59:30Z' })]);
    const body = (await t.call({ method: 'GET', url: URL })).json();
    expect(body.thread).toBeUndefined();
    expect(t.queries.markInboundRead).not.toHaveBeenCalled();
  });

  it('sales: the two signed-link templates never travel, in new rows or pending ones', async () => {
    t.delta.newer.mockResolvedValue([row('link', { template_key: 'lesson_join_link' }), row('ok')]);
    t.delta.pending.mockResolvedValue([row('fb', { template_key: 'lesson_feedback_request' })]);
    const body = (await t.call({ method: 'GET', url: URL, token: 'sales' })).json();
    expect(body.messages.map((m: { id: string }) => m.id)).toEqual(['ok']);
    expect(body.pending).toEqual([]);
  });

  it('teacher: another family’s chat is 403 before any read; a new row stamps their own read only', async () => {
    t.teacher.teacher.mockResolvedValue({ id: 'tch-1', display_name_ar: 'أبرار', phone_e164: '+201001234567' });
    t.teacher.phones.mockResolvedValue(['+966559999999']);
    expect((await t.call({ method: 'GET', url: URL, token: 'teacher' })).statusCode).toBe(403);
    expect(t.delta.newer).not.toHaveBeenCalled();
    t.teacher.phones.mockResolvedValue([PHONE]);
    t.delta.newer.mockResolvedValue([inbound('in1')]);
    const body = (await t.call({ method: 'GET', url: URL, token: 'teacher' })).json();
    expect(t.teacher.stampRead).toHaveBeenCalledWith(expect.objectContaining({ teacherId: 'tch-1', phone: PHONE }));
    expect(t.queries.markInboundRead).not.toHaveBeenCalled();
    expect(body.thread.unread_count).toBe(0);
  });

  it('400 on a bad `after` or a pending id that is not a uuid; at most 20 ids', async () => {
    const bad = (q: string) => t.call({ method: 'GET', url: `/threads/${encodeURIComponent(PHONE)}?${q}` });
    expect((await bad('after=yesterday')).statusCode).toBe(400);
    expect((await bad(`after=${AFTER}&pending=1,2`)).statusCode).toBe(400);
    const many = Array.from({ length: 21 }, (_, i) => `c0000000-0000-4000-8000-${String(i).padStart(12, '0')}`).join(',');
    expect((await bad(`after=${AFTER}&pending=${many}`)).statusCode).toBe(400);
  });
});
