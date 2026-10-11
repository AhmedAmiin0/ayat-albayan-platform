import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messageRow } from '../whatsapp/sender.fakes';
import { templateRow } from '../whatsapp/whatsapp.fakes';
import { PHONE, threadRow, threadStudent } from './inbox.fakes';
import { inboxApp } from './test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const LEAD_PHONE = '+966551110000';
const OTHER = '+966559999999';
const URL = `/threads/${encodeURIComponent(PHONE)}`;
const REQ = 'c0000000-0000-4000-8000-000000000002';
const LESSON = '00000000-0000-4000-8000-0000000000d1';
const FRESH = new Date(Date.now() - 3_600_000).toISOString();
/** Salesperson s1 owns a lead (LEAD_PHONE) that became guardian g1 (PHONE); s2 owns nothing. */
const OWN = { leadIds: ['l1'], guardianIds: ['g1'], studentIds: ['s1'], phones: [LEAD_PHONE, PHONE] };
const NONE = { leadIds: [], guardianIds: [], studentIds: [], phones: [] };
const text = (over: { url?: string; token?: string } = {}) =>
  ({ method: 'POST' as const, url: `${over.url ?? URL}/text`, token: over.token ?? 'sales', body: { text: 'أهلًا', clientRequestId: REQ } });

describe('sales mode H1-H4: only the chats of my leads and the families they became', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.sales.ownership.mockImplementation(async (id: string) => (id === 's1' ? OWN : NONE));
    t.queries.list.mockResolvedValue({ items: [threadRow({ guardian_id: 'g1', guardian_name: 'أم ياسمين' })], total: 1 });
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: FRESH, guardian_id: 'g1', guardian_name: 'أم ياسمين' }));
    t.queries.messages.mockResolvedValue([]);
    t.queries.markInboundRead.mockResolvedValue([]);
    t.queries.lessons.mockResolvedValue([]);
    t.queries.familyTags.mockResolvedValue(new Map([['g1', { badge: 'subscribed' as const, unpaid: true }]]));
    t.queries.people.mockResolvedValue({
      guardian: { id: 'g1', name: 'أم ياسمين' },
      lead: { id: 'l1', status: 'converted' },
      students: [threadStudent(), threadStudent({ id: 'other-kid' })],
    });
    t.queries.salesOwnsLesson.mockResolvedValue(true);
    t.queries.enqueue.mockImplementation(async (row: object) => messageRow({ ...row, id: 'm9', status: 'queued' }));
    t.queries.get.mockImplementation(async () => ({ ...messageRow({ id: 'm9', status: 'sent', body: 'أهلًا', template_key: null }), sent_by_teacher: null }));
    t.templates.get.mockResolvedValue(templateRow({ key: 'lesson_reminder' }));
    t.templates.all.mockResolvedValue([]);
  });

  it('H1 lists exactly my scope; the lead stays, the money flag does not', async () => {
    const res = await t.call({ method: 'GET', url: '/threads', token: 'sales' });
    expect(res.statusCode).toBe(200);
    expect(t.queries.list).toHaveBeenCalledWith(expect.objectContaining({ phones: [LEAD_PHONE, PHONE] }));
    const [item] = res.json().items;
    expect(item).toMatchObject({ lead_id: expect.any(String), lead_status: 'new', badge: 'subscribed', unpaid: false });
  });

  it('H1 a salesperson with no leads gets an empty page without a query', async () => {
    const res = await t.call({ method: 'GET', url: '/threads', token: 'salesB' });
    expect(res.json()).toEqual({ items: [], total: 0, page: 1, pageSize: 25 });
    expect(t.queries.list).not.toHaveBeenCalled();
  });

  it('H2 sales B cannot read sales A thread: 403 not_your_thread, nothing read', async () => {
    const res = await t.call({ method: 'GET', url: URL, token: 'salesB' });
    expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_thread']);
    expect(t.queries.messages).not.toHaveBeenCalled();
    const stranger = await t.call({ method: 'GET', url: `/threads/${encodeURIComponent(OTHER)}`, token: 'sales' });
    expect([stranger.statusCode, stranger.json().code]).toEqual([403, 'not_your_thread']);
  });

  it('H2 my thread: same payload shape, children without packages or money, link templates dropped', async () => {
    t.queries.messages.mockResolvedValue([
      { ...messageRow({ id: 'm1', template_key: null, body: 'سلام' }), lesson: null },
      { ...messageRow({ id: 'm2', template_key: 'lesson_join_link', template_params: { '1': 'x', button: 'SECRET' } }), lesson: null },
      { ...messageRow({ id: 'm3', template_key: 'lesson_feedback_request', template_params: { '1': 'x', button: 'SECRET' } }), lesson: null },
    ]);
    const res = await t.call({ method: 'GET', url: URL, token: 'sales' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.messages.map((m: { id: string }) => m.id)).toEqual(['m1']);
    expect(JSON.stringify(body)).not.toContain('SECRET');
    expect(body.thread).toMatchObject({ unpaid: false, lead_id: expect.any(String) });
    expect(body.people.lead).toEqual({ id: 'l1', status: 'converted' });
    expect(body.people.students.map((s: { id: string }) => s.id)).toEqual(['s1']);
    expect(body.people.students[0].subscription).toBeNull();
    expect(JSON.stringify(body)).not.toMatch(/price|due_amount|paid_amount/);
  });

  it('H3 text in the window: 201 from the academy number, own dedup space, audited as sales (no teacher)', async () => {
    const res = await t.call(text());
    expect(res.statusCode).toBe(201);
    expect(t.queries.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      phone_e164: PHONE, created_by: 's1', sent_by_teacher_id: null, dedup_key: `sales:s1:${PHONE}:${REQ}`,
    }));
    const after = t.audit.record.mock.calls[0]?.[0].after;
    expect(after).toMatchObject({ sales_id: 's1' });
    expect(after).not.toHaveProperty('teacher_id');
  });

  it('H3 keeps the rules: 409 session_closed after 24 h; 403 for a phone that is not mine', async () => {
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: '2026-01-01T00:00:00Z' }));
    const closed = await t.call(text());
    expect([closed.statusCode, closed.json().code]).toEqual([409, 'session_closed']);
    const other = await t.call(text({ token: 'salesB' }));
    expect([other.statusCode, other.json().code]).toEqual([403, 'not_your_thread']);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('H4 an approved template goes out; a lesson outside my scope is 403; the link templates stay refused', async () => {
    const send = (body: object) =>
      t.call({ method: 'POST', url: `${URL}/template`, token: 'sales', body: { params: { '1': 'ياسمين', '2': 'الأحد 16:00', button: 'ayat-room' }, clientRequestId: REQ, ...body } });
    expect((await send({ key: 'lesson_reminder', lessonId: LESSON })).statusCode).toBe(201);
    expect(t.queries.salesOwnsLesson).toHaveBeenCalledWith('s1', LESSON);
    t.queries.salesOwnsLesson.mockResolvedValue(false);
    const theirs = await send({ key: 'lesson_reminder', lessonId: LESSON });
    expect([theirs.statusCode, theirs.json().code]).toEqual([403, 'not_your_lesson']);
    expect((await send({ key: 'lesson_join_link' })).json().code).toBe('use_join_link');
    expect((await send({ key: 'lesson_feedback_request' })).json().code).toBe('use_feedback_request');
  });

  it('the media routes stay admin only', async () => {
    const res = await t.call({ method: 'GET', url: `${URL}/media`, token: 'sales' });
    expect(res.statusCode).toBe(403);
  });
});
