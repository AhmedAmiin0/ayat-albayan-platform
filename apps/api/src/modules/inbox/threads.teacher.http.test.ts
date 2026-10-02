import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PHONE, threadRow } from './inbox.fakes';
import { inboxApp } from './test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const OWN = '+201001234567';
const OTHER = '+966559999999';
const URL = `/threads/${encodeURIComponent(PHONE)}`;
const ME = { id: 'tch-1', display_name_ar: 'أبرار', phone_e164: OWN };
const kid = (id: string, name: string) => ({ id, code: 'AB-0101', name, status: 'active' as const, teacher: { display_name_ar: 'أبرار' } });

describe('teacher mode H1/H2: only my families, my unread, no lead, no money (R-TCH-03, R-MSG-05)', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.teacher.teacher.mockImplementation(async (profileId: string) => (profileId === 't1' ? ME : null));
    t.teacher.phones.mockResolvedValue([PHONE, OWN]);
    t.teacher.unread.mockResolvedValue(new Map([[PHONE, 2]]));
    t.queries.list.mockResolvedValue({ items: [threadRow({ guardian_id: 'g1', guardian_name: 'أم ياسمين', unread_count: 5 })], total: 1 });
    t.queries.thread.mockResolvedValue(threadRow({ guardian_id: 'g1', guardian_name: 'أم ياسمين', unread_count: 5 }));
    t.queries.messages.mockResolvedValue([]);
    t.queries.lessons.mockResolvedValue([]);
    t.teacher.guardianStudents.mockResolvedValue([kid('s1', 'ياسمين'), kid('s2', 'مريم')]);
    t.me.students.mockResolvedValue([{ id: 's1', code: 'AB-0101', name: 'ياسمين', tz: 'Asia/Riyadh', status: 'active' }]);
  });

  it('H1 lists only the scope, with my unread, lead fields cleared and no «مشترك» lookup', async () => {
    const res = await t.call({ method: 'GET', url: '/threads', token: 'teacher' });
    expect(res.statusCode).toBe(200);
    expect(t.queries.list).toHaveBeenCalledWith({ page: 1, pageSize: 25, unread: false, phones: [PHONE, OWN] });
    expect(t.teacher.unread).toHaveBeenCalledWith('tch-1', [PHONE, OWN]);
    const [item] = res.json().items;
    expect(item).toMatchObject({ unread_count: 2, lead_id: null, lead_name: null, lead_status: null, lead_source: null, subscribed: false });
    expect(t.queries.subscribedGuardians).not.toHaveBeenCalled();
  });

  it('H1 unread=true pages only the phones with my unread; none → an empty page without a query', async () => {
    await t.call({ method: 'GET', url: '/threads?unread=true', token: 'teacher' });
    expect(t.queries.list).toHaveBeenCalledWith(expect.objectContaining({ unread: false, phones: [PHONE] }));
    t.queries.list.mockClear();
    t.teacher.unread.mockResolvedValue(new Map());
    const res = await t.call({ method: 'GET', url: '/threads?unread=true', token: 'teacher' });
    expect(res.json()).toEqual({ items: [], total: 0, page: 1, pageSize: 25 });
    expect(t.queries.list).not.toHaveBeenCalled();
  });

  it('H1 an empty scope is an empty page (never .in([]))', async () => {
    t.teacher.phones.mockResolvedValue([]);
    const res = await t.call({ method: 'GET', url: '/threads?search=ياسمين', token: 'teacher' });
    expect(res.json()).toEqual({ items: [], total: 0, page: 1, pageSize: 25 });
    expect(t.queries.list).not.toHaveBeenCalled();
    expect(t.teacher.unread).not.toHaveBeenCalled();
  });

  it('404 teacher_not_linked for a teacher login without a teachers row', async () => {
    const res = await t.call({ method: 'GET', url: '/threads', token: 'unlinked' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'teacher_not_linked']);
  });

  it("H2 403 not_your_thread for another teacher's family; nothing is read or stamped", async () => {
    const res = await t.call({ method: 'GET', url: `/threads/${encodeURIComponent(OTHER)}`, token: 'teacher' });
    expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_thread']);
    expect(t.queries.messages).not.toHaveBeenCalled();
    expect(t.teacher.stampRead).not.toHaveBeenCalled();
  });

  it("H2 opening stamps my read mark only: the admin's read_at and Meta's receipt are untouched", async () => {
    const res = await t.call({ method: 'GET', url: URL, token: 'teacher' });
    expect(res.statusCode).toBe(200);
    expect(t.teacher.stampRead).toHaveBeenCalledWith({ teacherId: 'tch-1', phone: PHONE, at: expect.any(Date) });
    expect(t.queries.markInboundRead).not.toHaveBeenCalled();
    expect(t.client.markRead).not.toHaveBeenCalled();
    expect(res.json().thread).toMatchObject({ unread_count: 0, lead_id: null, subscribed: false });
    t.teacher.stampRead.mockClear();
    await t.call({ method: 'GET', url: `${URL}?before=2026-10-02T08:00:00Z`, token: 'teacher' });
    expect(t.teacher.stampRead).not.toHaveBeenCalled();
  });

  it('H2 people: the guardian and only my students, no package or money; my lessons only', async () => {
    const body = (await t.call({ method: 'GET', url: URL, token: 'teacher' })).json();
    expect(body.people).toEqual({
      guardian: { id: 'g1', name: 'أم ياسمين' },
      lead: null,
      students: [{ id: 's1', code: 'AB-0101', name: 'ياسمين', teacher_name: 'أبرار', status: 'active', subscription: null }],
    });
    expect(t.me.students).toHaveBeenCalledWith('tch-1');
    expect(t.queries.people).not.toHaveBeenCalled();
    expect(t.queries.lessons).toHaveBeenCalledWith(expect.objectContaining({ phone_e164: PHONE }), expect.any(Date), 'tch-1');
  });

  it('H2 my own chat with the academy is readable (no guardian → no students)', async () => {
    t.queries.thread.mockResolvedValue(threadRow({ phone_e164: OWN, lead_id: null, teacher_id: 'tch-1', teacher_name: 'أبرار' }));
    const res = await t.call({ method: 'GET', url: `/threads/${encodeURIComponent(OWN)}`, token: 'teacher' });
    expect(res.statusCode).toBe(200);
    expect(res.json().people).toEqual({ guardian: null, lead: null, students: [] });
    expect(t.teacher.guardianStudents).not.toHaveBeenCalled();
  });
});
