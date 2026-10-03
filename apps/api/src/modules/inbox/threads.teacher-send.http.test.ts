import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messageRow } from '../whatsapp/sender.fakes';
import { templateRow } from '../whatsapp/whatsapp.fakes';
import { PHONE, threadRow } from './inbox.fakes';
import { inboxApp, TEACHER } from './test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const OWN = '+201001234567';
const URL = `/threads/${encodeURIComponent(PHONE)}`;
const REQ = 'c0000000-0000-4000-8000-000000000002';
const LESSON = '00000000-0000-4000-8000-0000000000d1';
const FRESH = new Date(Date.now() - 3_600_000).toISOString();
const PARAMS = { '1': 'ياسمين', '2': 'الأحد 16:00', button: 'ayat-room' };
const ME = { id: 'tch-1', display_name_ar: 'أبرار', phone_e164: OWN };
const text = (over: { url?: string; token?: string } = {}) =>
  ({ method: 'POST' as const, url: `${over.url ?? URL}/text`, token: over.token ?? 'teacher', body: { text: 'أهلًا', clientRequestId: REQ } });
const tpl = (body: object) =>
  ({ method: 'POST' as const, url: `${URL}/template`, token: 'teacher', body: { params: PARAMS, clientRequestId: REQ, ...body } });

describe('teacher mode H3/H4: reply from the academy number, attributed (R-MSG-05, owner 2026-10-02)', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.teacher.teacher.mockImplementation(async (profileId: string) => (profileId === TEACHER.id ? ME : null));
    t.teacher.phones.mockResolvedValue([PHONE, OWN]);
    t.queries.lessonTeacher.mockResolvedValue('tch-1');
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: FRESH, guardian_id: 'g1' }));
    t.queries.enqueue.mockImplementation(async (row: object) => messageRow({ ...row, id: 'm9', status: 'queued' }));
    t.queries.get.mockImplementation(async () => ({ ...messageRow({ id: 'm9', status: 'sent', body: 'أهلًا', template_key: null }), sent_by_teacher: { display_name_ar: 'أبرار' } }));
    t.templates.get.mockResolvedValue(templateRow({ key: 'lesson_reminder' }));
  });

  it('H3 in the window: 201, the row names the teacher, its own dedup key space, audited with the name', async () => {
    const res = await t.call(text());
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ id: 'm9', status: 'sent', sent_by_teacher_name: 'أبرار' });
    expect(t.queries.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      phone_e164: PHONE, body: 'أهلًا', created_by: TEACHER.id, sent_by_teacher_id: 'tch-1', dedup_key: `teacher:tch-1:${PHONE}:${REQ}`,
    }));
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({
      actorId: TEACHER.id, action: 'thread_text', after: expect.objectContaining({ teacher_id: 'tch-1', teacher_name: 'أبرار' }),
    }));
  });

  it('a replayed clientRequestId returns the first row and sends nothing again', async () => {
    const first = messageRow({ id: 'm9', status: 'sent', template_key: null, body: 'أهلًا', sent_by_teacher_id: 'tch-1' });
    t.queries.enqueue.mockResolvedValue({ ...first, replayed: true });
    const res = await t.call(text());
    expect([res.statusCode, res.json().id]).toEqual([201, 'm9']);
    expect(t.sender.kick).not.toHaveBeenCalled();
    expect(t.audit.record).not.toHaveBeenCalled(); // the first send was audited already
  });

  it('H3 409 session_closed after 24 h (the window rule is unchanged)', async () => {
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: '2026-01-01T00:00:00Z' }));
    const res = await t.call(text());
    expect([res.statusCode, res.json().code]).toEqual([409, 'session_closed']);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('403 own_thread_read_only on my own chat; 403 not_your_thread outside my families', async () => {
    const own = await t.call(text({ url: `/threads/${encodeURIComponent(OWN)}` }));
    expect([own.statusCode, own.json().code]).toEqual([403, 'own_thread_read_only']);
    const other = await t.call(text({ url: `/threads/${encodeURIComponent('+966559999999')}` }));
    expect([other.statusCode, other.json().code]).toEqual([403, 'not_your_thread']);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('H4 403 template_not_allowed outside the reminder templates', async () => {
    const res = await t.call(tpl({ key: 'booking_confirmation' }));
    expect([res.statusCode, res.json().code]).toEqual([403, 'template_not_allowed']);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it("H4 403 not_your_lesson for another teacher's lesson; my lesson goes out attributed", async () => {
    t.queries.lessonTeacher.mockResolvedValueOnce('tch-other');
    const theirs = await t.call(tpl({ key: 'lesson_reminder', lessonId: LESSON }));
    expect([theirs.statusCode, theirs.json().code]).toEqual([403, 'not_your_lesson']);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
    const mine = await t.call(tpl({ key: 'lesson_reminder', lessonId: LESSON }));
    expect(mine.statusCode).toBe(201);
    expect(t.queries.lessonTeacher).toHaveBeenLastCalledWith(LESSON);
    expect(t.queries.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      template_key: 'lesson_reminder', lesson_id: LESSON, sent_by_teacher_id: 'tch-1', dedup_key: `teacher:tch-1:${PHONE}:${REQ}`,
    }));
  });

  it('an admin send stays the academy: no sent_by_teacher_id, admin: dedup, no teacher in the audit', async () => {
    await t.call(text({ token: 'admin' }));
    expect(t.queries.enqueue).toHaveBeenCalledWith(expect.objectContaining({ sent_by_teacher_id: null, dedup_key: `admin:${PHONE}:${REQ}` }));
    expect(t.audit.record.mock.calls[0]?.[0].after).not.toHaveProperty('teacher_id');
    expect(t.teacher.teacher).not.toHaveBeenCalled();
  });
});
