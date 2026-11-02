import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PHONE } from '@/modules/messaging/inbox/inbox.fakes';
import { inboxApp } from '@/modules/messaging/inbox/test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const OTHER = '+966559999999';
const ME = { id: 'tch-1', display_name_ar: 'أبرار', phone_e164: '+201001234567' };
const url = (phone: string, query: string) =>
  `/threads/${encodeURIComponent(phone)}/search?${query}`;
const row = (n: number, over: object = {}) => ({
  id: `b0000000-0000-4000-8000-00000000000${n}`,
  created_at: `2026-10-0${n}T10:00:00.000Z`,
  body: 'رابط الحلقة',
  media_name: null,
  template_key: null,
  ...over,
});

// «بحث» inside a chat (owner 2026-11-02): the same visibility as reading the chat.
describe('GET /threads/:phone/search', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.teacher.teacher.mockImplementation(async (p: string) => (p === 't1' ? ME : null));
    t.teacher.phones.mockResolvedValue([PHONE]);
    t.search.rows.mockResolvedValue([row(1), row(2, { template_key: 'lesson_join_link' })]);
  });

  it('the admin searches any chat, folded, newest first, with the total', async () => {
    const res = await t.call({ method: 'GET', url: url(PHONE, `q=${encodeURIComponent('الحلقه')}`) });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ total: 2, next_cursor: null });
    expect(res.json().items.map((h: { id: string }) => h.id.at(-1))).toEqual(['2', '1']);
    expect(t.search.rows).toHaveBeenCalledWith(PHONE);
  });

  it('sales never finds a link template row (as in her pages)', async () => {
    const res = await t.call({ method: 'GET', url: url(PHONE, 'q=%D8%B1%D8%A7%D8%A8%D8%B7'), token: 'sales' });
    expect([res.statusCode, res.json().total]).toEqual([200, 1]);
  });

  it('a teacher searches their families; a chat they cannot read is 403 with no read', async () => {
    const mine = await t.call({ method: 'GET', url: url(PHONE, 'q=x'), token: 'teacher' });
    expect(mine.statusCode).toBe(200);
    t.search.rows.mockClear();
    const other = await t.call({ method: 'GET', url: url(OTHER, 'q=x'), token: 'teacher' });
    expect([other.statusCode, other.json().code]).toEqual([403, 'not_your_thread']);
    expect(t.search.rows).not.toHaveBeenCalled();
  });

  it('a guardian is 403; a blank q, a bad cursor or a bad phone is 400', async () => {
    expect((await t.call({ method: 'GET', url: url(PHONE, 'q=x'), token: 'guardian' })).statusCode).toBe(403);
    for (const bad of [url(PHONE, 'q=%20'), url(PHONE, 'q=x&cursor=%25_%25'), url('123', 'q=x')]) {
      expect((await t.call({ method: 'GET', url: bad })).statusCode).toBe(400);
    }
    expect(t.search.rows).not.toHaveBeenCalled();
  });
});
