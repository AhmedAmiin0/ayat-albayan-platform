import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PHONE, threadRow } from './inbox.fakes';
import { inboxApp } from './test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const LIST = '0c000000-0000-4000-8000-000000000001';
const URL = `/threads/${encodeURIComponent(PHONE)}`;
const REFS = [{ id: LIST, name: 'بانتظار الدفع' }];

describe('GET /threads?list= and the thread\'s lists (docs/22 §3)', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.queries.list.mockResolvedValue({ items: [threadRow()], total: 1 });
    t.queries.thread.mockResolvedValue(threadRow());
    t.queries.messages.mockResolvedValue([]);
    t.queries.markInboundRead.mockResolvedValue([]);
    t.queries.lessons.mockResolvedValue([]);
    t.queries.people.mockResolvedValue({ guardian: null, lead: null, students: [] });
    t.queries.familyTags.mockResolvedValue(new Map());
    t.lists.listsOf.mockResolvedValue(REFS);
  });

  it('narrows to the list\'s chats, together with search, unread and status (admin and sales)', async () => {
    for (const token of ['admin', 'sales']) {
      const res = await t.call({ method: 'GET', url: `/threads?list=${LIST}&search=أم&unread=true&status=new`, token });
      expect(res.statusCode).toBe(200);
    }
    expect(t.queries.list).toHaveBeenCalledTimes(2);
    expect(t.queries.list).toHaveBeenCalledWith(expect.objectContaining({ list: LIST, search: 'أم', unread: true, status: 'new' }));
    expect(t.queries.list).not.toHaveBeenCalledWith(expect.objectContaining({ phones: expect.anything() }));
  });

  it('a malformed list is an empty page, never a 500 (an unknown one is empty in SQL)', async () => {
    const res = await t.call({ method: 'GET', url: '/threads?list=not-a-uuid&page=2', token: 'sales' });
    expect([res.statusCode, res.json()]).toEqual([200, { items: [], total: 0, page: 2, pageSize: 25 }]);
    expect(t.queries.list).not.toHaveBeenCalled();
  });

  it('a teacher\'s list param is ignored: their own scope only, no list read', async () => {
    t.teacher.teacher.mockResolvedValue({ id: 'tch-1', display_name_ar: 'أبرار', phone_e164: null });
    t.teacher.phones.mockResolvedValue([PHONE]);
    t.teacher.unread.mockResolvedValue(new Map());
    const res = await t.call({ method: 'GET', url: `/threads?list=${LIST}`, token: 'teacher' });
    expect(res.statusCode).toBe(200);
    expect(t.queries.list).toHaveBeenCalledWith({ page: 1, pageSize: 25, unread: false, phones: [PHONE] });
  });

  it('the first page of a chat carries its lists for admin and sales; older pages do not', async () => {
    for (const token of ['admin', 'sales']) {
      const res = await t.call({ method: 'GET', url: URL, token });
      expect(res.json().lists).toEqual(REFS);
    }
    const older = await t.call({ method: 'GET', url: `${URL}?before=2026-10-02T08:00:00Z`, token: 'sales' });
    expect(older.json().lists).toBeUndefined();
    expect(t.lists.listsOf).toHaveBeenCalledTimes(2);
  });

  it('a teacher\'s chat has no lists', async () => {
    t.teacher.teacher.mockResolvedValue({ id: 'tch-1', display_name_ar: 'أبرار', phone_e164: null });
    t.teacher.phones.mockResolvedValue([PHONE]);
    t.teacher.unread.mockResolvedValue(new Map());
    t.teacher.guardianStudents.mockResolvedValue([]);
    t.teacher.myStudentIds.mockResolvedValue(new Set());
    const res = await t.call({ method: 'GET', url: URL, token: 'teacher' });
    expect(res.statusCode).toBe(200);
    expect(res.json().lists).toBeUndefined();
    expect(t.lists.listsOf).not.toHaveBeenCalled();
  });
});
