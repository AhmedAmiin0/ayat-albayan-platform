import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messageRow } from '../whatsapp/sender/sender.fakes';
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
    t.queries.markInboundRead.mockResolvedValue([{ waMessageId: 'wamid.newest', line: 'notifications' }]);
    t.client.configured.mockReturnValue(true);
    t.chatClient.configured.mockReturnValue(true);
    t.queries.people.mockResolvedValue(NO_PEOPLE);
    t.queries.familyTags.mockResolvedValue(new Map());
  });

  it('H1 tags per row from its guardian, one read for the page: «مشترك», «اشتراكه خلص», «غير مدفوع»', async () => {
    const rows = [
      threadRow({ guardian_id: 'g1' }),
      threadRow({ phone_e164: '+966551112222', guardian_id: 'g2' }),
      threadRow({ phone_e164: '+966551113333', guardian_id: 'g3' }),
      threadRow(),
    ];
    t.queries.list.mockResolvedValue({ items: rows, total: 4 });
    t.queries.familyTags.mockResolvedValue(new Map([['g1', { badge: 'subscribed', unpaid: true }], ['g2', { badge: 'expired', unpaid: false }]]));
    const items = (await t.call({ method: 'GET', url: '/threads' })).json().items;
    const tags = items.map((i: { subscribed: boolean; badge: string | null; unpaid: boolean }) => [i.subscribed, i.badge, i.unpaid]);
    expect(tags).toEqual([[true, 'subscribed', true], [false, 'expired', false], [false, 'none', false], [false, null, false]]);
    expect(t.queries.familyTags).toHaveBeenCalledWith(['g1', 'g2', 'g3']);
  });

  it('H2 first page: people, and the thread’s tags from the same badge', async () => {
    t.queries.messages.mockResolvedValue([]);
    const people = { guardian: { id: 'g1', name: 'أم ياسمين' }, lead: null, students: [threadStudent()] };
    t.queries.people.mockResolvedValue(people);
    t.queries.thread.mockResolvedValue(threadRow({ guardian_id: 'g1' }));
    const body = (await t.call({ method: 'GET', url: URL })).json();
    expect([body.people, body.thread.subscribed, body.thread.badge]).toEqual([people, true, 'subscribed']);
    expect(t.queries.people).toHaveBeenCalledWith(threadRow({ guardian_id: 'g1' }));
  });

  it('H2 an older page skips the people (1 + 3 reads a child) and takes the list’s tags', async () => {
    t.queries.messages.mockResolvedValue([]);
    t.queries.thread.mockResolvedValue(threadRow({ guardian_id: 'g1' }));
    t.queries.familyTags.mockResolvedValue(new Map([['g1', { badge: 'subscribed', unpaid: false }]]));
    const body = (await t.call({ method: 'GET', url: `${URL}?before=2026-10-02T08:00:00Z` })).json();
    expect(body.people).toEqual(NO_PEOPLE);
    expect(body.thread.subscribed).toBe(true);
    expect(t.queries.people).not.toHaveBeenCalled();
    expect(t.queries.familyTags).toHaveBeenCalledWith(['g1']);
  });

  it('admin and teacher (teacher mode, threads.teacher.http.test); a guardian gets 403', async () => {
    expect((await t.call({ method: 'GET', url: '/threads', token: 'guardian' })).statusCode).toBe(403);
    expect((await t.call({ method: 'GET', url: URL, token: 'guardian' })).statusCode).toBe(403);
  });

  it('the admin path never resolves a teacher scope', async () => {
    t.queries.messages.mockResolvedValue([]);
    await t.call({ method: 'GET', url: '/threads' });
    await t.call({ method: 'GET', url: URL });
    expect(t.teacher.teacher).not.toHaveBeenCalled();
    expect(t.teacher.stampRead).not.toHaveBeenCalled();
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
    expect(t.chatClient.markRead).not.toHaveBeenCalled();
  });

  it('H2 a thread with unread inbound on both lines: one receipt per line, on that line', async () => {
    t.gate.open.mockResolvedValue(true);
    t.queries.messages.mockResolvedValue([]);
    t.queries.markInboundRead.mockResolvedValue([
      { waMessageId: 'wamid.n', line: 'notifications' },
      { waMessageId: 'wamid.c', line: 'chat' },
    ]);
    expect((await t.call({ method: 'GET', url: URL })).statusCode).toBe(200);
    expect(t.client.markRead.mock.calls).toEqual([['wamid.n']]);
    expect(t.chatClient.markRead.mock.calls).toEqual([['wamid.c']]);
  });

  it('H2 gate closed: stamps read but never calls Meta; an older page stamps nothing', async () => {
    t.gate.open.mockResolvedValue(false);
    t.queries.messages.mockResolvedValue([]);
    await t.call({ method: 'GET', url: URL });
    expect(t.client.markRead).not.toHaveBeenCalled();
    expect(t.chatClient.markRead).not.toHaveBeenCalled();
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
