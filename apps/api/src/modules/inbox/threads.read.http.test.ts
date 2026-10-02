import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messageRow } from '../whatsapp/sender.fakes';
import { PHONE, threadRow, threadStudent } from './inbox.fakes';
import { inboxApp, NO_PEOPLE } from './test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const URL = `/threads/${encodeURIComponent(PHONE)}`;
const inbound = (id: string, at: string) =>
  messageRow({ id, direction: 'inbound', status: 'delivered', template_key: null, template_params: null, body: 'سلام', created_at: at });

describe('H1/H2 threads (docs/12 §4, R-LEAD-02)', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.queries.list.mockResolvedValue({ items: [threadRow()], total: 1 });
    t.queries.thread.mockResolvedValue(threadRow());
    t.queries.markInboundRead.mockResolvedValue('wamid.newest');
    t.queries.people.mockResolvedValue(NO_PEOPLE);
    t.queries.subscribedGuardians.mockResolvedValue(new Set());
  });

  it('H1 «مشترك»: subscribed per row from its guardian, one read for the page', async () => {
    const rows = [threadRow({ guardian_id: 'g1' }), threadRow({ phone_e164: '+966551112222', guardian_id: 'g2' }), threadRow()];
    t.queries.list.mockResolvedValue({ items: rows, total: 3 });
    t.queries.subscribedGuardians.mockResolvedValue(new Set(['g1']));
    const items = (await t.call({ method: 'GET', url: '/threads' })).json().items;
    expect(items.map((i: { subscribed: boolean }) => i.subscribed)).toEqual([true, false, false]);
    expect(t.queries.subscribedGuardians).toHaveBeenCalledWith(['g1', 'g2']);
  });

  it('H2 people on every page; the thread is subscribed from the same badge', async () => {
    t.queries.messages.mockResolvedValue([]);
    const people = { guardian: { id: 'g1', name: 'أم ياسمين' }, lead: null, students: [threadStudent()] };
    t.queries.people.mockResolvedValue(people);
    const body = (await t.call({ method: 'GET', url: `${URL}?before=2026-10-02T08:00:00Z` })).json();
    expect([body.people, body.thread.subscribed]).toEqual([people, true]);
    expect(t.queries.people).toHaveBeenCalledWith(threadRow());
  });

  it('admin only', async () => {
    expect((await t.call({ method: 'GET', url: '/threads', token: 'teacher' })).statusCode).toBe(403);
    expect((await t.call({ method: 'GET', url: URL, token: 'teacher' })).statusCode).toBe(403);
  });

  it('H1 pages v_threads with search and unread', async () => {
    const res = await t.call({ method: 'GET', url: '/threads?search=0501234567&unread=true&page=2&pageSize=10' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ total: 1, page: 2, pageSize: 10, items: [{ phone_e164: PHONE, unread_count: 1 }] });
    expect(t.queries.list).toHaveBeenCalledWith({ page: 2, pageSize: 10, search: '0501234567', unread: true });
  });

  it('H2 returns oldest → newest with has_more, stamps read and sends the receipt when the gate is open', async () => {
    t.gate.open.mockResolvedValue(true);
    t.queries.messages.mockResolvedValue([inbound('m3', '2026-10-02T08:03:00Z'), inbound('m2', '2026-10-02T08:02:00Z'), inbound('m1', '2026-10-02T08:01:00Z')]);
    const res = await t.call({ method: 'GET', url: `${URL}?limit=2` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.messages.map((m: { id: string }) => m.id)).toEqual(['m2', 'm3']);
    expect([body.has_more, body.thread.phone_e164]).toEqual([true, PHONE]);
    expect(t.queries.markInboundRead).toHaveBeenCalledWith(PHONE, expect.any(Date));
    expect(t.client.markRead).toHaveBeenCalledWith('wamid.newest');
  });

  it('H2 gate closed: stamps read but never calls Meta; an older page stamps nothing', async () => {
    t.gate.open.mockResolvedValue(false);
    t.queries.messages.mockResolvedValue([]);
    await t.call({ method: 'GET', url: URL });
    expect(t.client.markRead).not.toHaveBeenCalled();
    t.queries.markInboundRead.mockClear();
    await t.call({ method: 'GET', url: `${URL}?before=2026-10-02T08:00:00Z` });
    expect(t.queries.markInboundRead).not.toHaveBeenCalled();
    expect(t.queries.messages).toHaveBeenLastCalledWith({ phone: PHONE, before: '2026-10-02T08:00:00Z', limit: 50 });
  });

  it('H2 400 invalid_phone', async () => {
    const res = await t.call({ method: 'GET', url: '/threads/not-a-phone' });
    expect([res.statusCode, res.json().code]).toEqual([400, 'invalid_phone']);
  });
});
