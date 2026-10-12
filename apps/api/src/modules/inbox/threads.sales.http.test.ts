import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messageRow } from '../whatsapp/sender.fakes';
import { templateRow } from '../whatsapp/whatsapp.fakes';
import { PHONE, threadRow, threadStudent } from './inbox.fakes';
import { inboxApp } from './test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const OTHER = '+966559999999';
const URL = `/threads/${encodeURIComponent(PHONE)}`;
const REQ = 'c0000000-0000-4000-8000-000000000002';
const LESSON = '00000000-0000-4000-8000-0000000000d1';
const FRESH = new Date(Date.now() - 3_600_000).toISOString();
const text = (over: { url?: string; token?: string } = {}) =>
  ({ method: 'POST' as const, url: `${over.url ?? URL}/text`, token: over.token ?? 'sales', body: { text: 'أهلًا', clientRequestId: REQ } });

describe('sales mode H1-H4: every chat, with the sales redactions (docs/16)', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
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
    t.queries.enqueue.mockImplementation(async (row: object) => messageRow({ ...row, id: 'm9', status: 'queued' }));
    t.queries.get.mockImplementation(async () => ({ ...messageRow({ id: 'm9', status: 'sent', body: 'أهلًا', template_key: null }), sent_by_teacher: null }));
    t.templates.get.mockResolvedValue(templateRow({ key: 'lesson_reminder' }));
    t.templates.all.mockResolvedValue([]);
  });

  it('H1 lists every chat (no phone filter, ownership not read); the lead stays, the money flag does not', async () => {
    const res = await t.call({ method: 'GET', url: '/threads', token: 'sales' });
    expect(res.statusCode).toBe(200);
    expect(t.queries.list).toHaveBeenCalledWith(expect.not.objectContaining({ phones: expect.anything() }));
    expect(t.sales.ownership).not.toHaveBeenCalled();
    const [item] = res.json().items;
    expect(item).toMatchObject({ lead_id: expect.any(String), lead_status: 'new', badge: 'subscribed', unpaid: false });
    const other = await t.call({ method: 'GET', url: '/threads', token: 'salesB' });
    expect(other.json().total).toBe(1);
  });

  it('H2 a chat that is not hers (another salesperson, or nobody): 200 with the same redactions', async () => {
    for (const [token, url] of [['salesB', URL], ['sales', `/threads/${encodeURIComponent(OTHER)}`]] as const) {
      const res = await t.call({ method: 'GET', url, token });
      expect([res.statusCode, res.json().thread.unpaid]).toEqual([200, false]);
    }
  });

  it('H2 any thread: same payload shape, every child without packages or money, link templates dropped', async () => {
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
    expect(body.people.students.map((s: { id: string }) => s.id)).toEqual(['s1', 'other-kid']);
    expect(body.people.students.map((s: { subscription: unknown }) => s.subscription)).toEqual([null, null]);
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

  it('H3 keeps the 24 h rule; another salesperson may answer the same chat, in her own dedup space', async () => {
    const other = await t.call(text({ token: 'salesB' }));
    expect(other.statusCode).toBe(201);
    expect(t.queries.enqueue).toHaveBeenCalledWith(expect.objectContaining({ dedup_key: `sales:s2:${PHONE}:${REQ}` }));
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: '2026-01-01T00:00:00Z' }));
    const closed = await t.call(text());
    expect([closed.statusCode, closed.json().code]).toEqual([409, 'session_closed']);
  });

  // Owner 2026-10-12: sales send only the starters the admin ticked (templateRow: sales_starter false).
  it('H4 a non-starter is 403 template_not_allowed; a starter goes out for any lesson; link templates stay refused', async () => {
    const send = (body: object) =>
      t.call({ method: 'POST', url: `${URL}/template`, token: 'salesB', body: { params: { '1': 'ياسمين', '2': 'الأحد 16:00', button: 'ayat-room' }, clientRequestId: REQ, ...body } });
    const refused = await send({ key: 'lesson_reminder', lessonId: LESSON });
    expect([refused.statusCode, refused.json().code]).toEqual([403, 'template_not_allowed']);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
    t.templates.get.mockResolvedValue(templateRow({ key: 'lesson_reminder', sales_starter: true }));
    expect((await send({ key: 'lesson_reminder', lessonId: LESSON })).statusCode).toBe(201);
    expect(t.queries.enqueue).toHaveBeenCalledWith(expect.objectContaining({ lesson_id: LESSON, created_by: 's2' }));
    expect((await send({ key: 'lesson_join_link' })).json().code).toBe('use_join_link');
    expect((await send({ key: 'lesson_feedback_request' })).json().code).toBe('use_feedback_request');
  });

  it('H4 a chat starter imported from Meta (key = its Meta name, four variables) is accepted and queued', async () => {
    const starter = templateRow({ key: 'academy_welcome', meta_name: 'academy_welcome', body_ar: '{{1}} {{2}} {{3}} {{4}}', params: ['var_1', 'var_2', 'var_3', 'var_4'], buttons: [], line: 'chat', sales_starter: true });
    t.templates.get.mockResolvedValue(starter);
    const params = { '1': 'أ', '2': 'ب', '3': 'ج', '4': 'د' };
    const res = await t.call({ method: 'POST', url: `${URL}/template`, token: 'sales', body: { key: 'academy_welcome', params, clientRequestId: REQ } });
    expect(res.statusCode).toBe(201);
    expect(t.queries.enqueue).toHaveBeenCalledWith(expect.objectContaining({ template_key: 'academy_welcome', template_params: params }));
    const missing = await t.call({ method: 'POST', url: `${URL}/template`, token: 'sales', body: { key: 'academy_welcome', params: { '1': 'أ' }, clientRequestId: REQ } });
    expect([missing.statusCode, missing.json().missing]).toEqual([400, ['2', '3', '4']]);
  });

  it('a teacher keeps her own scope: another family is still 403 not_your_thread', async () => {
    t.teacher.teacher.mockResolvedValue({ id: 'tch-1', display_name_ar: 'أبرار', phone_e164: '+201001234567' });
    t.teacher.phones.mockResolvedValue([PHONE]);
    const res = await t.call({ method: 'GET', url: `/threads/${encodeURIComponent(OTHER)}`, token: 'teacher' });
    expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_thread']);
  });

  it('the media picker (payment proofs) and the rating send stay admin only', async () => {
    const res = await t.call({ method: 'GET', url: `${URL}/media`, token: 'sales' });
    expect(res.statusCode).toBe(403);
    const rating = await t.call({ method: 'POST', url: `${URL}/rating`, token: 'sales', body: { clientRequestId: REQ } });
    expect(rating.statusCode).toBe(403);
  });
});
