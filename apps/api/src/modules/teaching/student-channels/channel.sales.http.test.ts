import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CH, channelApp, messageRow, ST } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const SALES = `/sales/students/${ST}/channel`;
const NAMES = new Map([['p-sa', 'سارة'], ['p-g', 'أم سلمى'], ['p-t1', 'أبرار']]);

// The assistant in the chat's one seat writes there; any other assistant is 404
// (channel.seat.http.test.ts takes and leaves it).
describe('the seated assistant in the student chat over HTTP', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    t.people.names.mockResolvedValue(NAMES);
    t.queries.isOpen.mockResolvedValue(true);
  });

  it('posts as sales: stored, read for her, pushed to the teacher and the family, not to her', async () => {
    const res = await t.post(`${SALES}/messages`, 'sales', { body: '  موعد التجديد غدًا  ' });
    expect(res.statusCode).toBe(201);
    const row = { channel_id: CH, sender_profile_id: 'p-sa', sender_role: 'sales' };
    expect(t.queries.insert).toHaveBeenCalledWith({ ...row, body: 'موعد التجديد غدًا' });
    expect(res.json()).toMatchObject({ sender_role: 'sales', sender_name: 'سارة', mine: true });
    expect(t.queries.setReadMark).toHaveBeenCalledWith(expect.objectContaining({ profileId: 'p-sa' }));
    expect(t.push.notifyProfiles).toHaveBeenCalledWith(expect.objectContaining({
      profileIds: ['p-t1', 'p-g', 'p-s'], vars: expect.objectContaining({ name: 'سارة' }),
    }));
  });

  it('her page is not read-only; her bubbles are mine, the others named with their role', async () => {
    t.queries.page.mockResolvedValueOnce([
      messageRow({ id: 'b', sender_profile_id: 'p-sa', sender_role: 'sales' }),
      messageRow(),
    ]);
    const page = (await t.call('GET', `${SALES}/messages`, 'sales')).json();
    expect(page.read_only).toBe(false);
    const seen = page.messages.map((m: { id: string; mine: boolean; sender_role: string }) => [
      m.id, m.mine, m.sender_role,
    ]);
    expect(seen).toEqual([['m1', false, 'guardian'], ['b', true, 'sales']]);
  });

  it('read marks and unread: hers counts everyone else\'s', async () => {
    expect((await t.post(`${SALES}/read`, 'sales', {})).statusCode).toBe(204);
    expect(t.queries.setReadMark).toHaveBeenCalledWith(expect.objectContaining({ profileId: 'p-sa' }));
    expect((await t.call('GET', `${SALES}/unread`, 'sales')).json()).toEqual({ unread: 2 });
    const countRoles = ['teacher', 'guardian', 'student', 'sales'];
    expect(t.queries.summaries).toHaveBeenLastCalledWith({ profileId: 'p-sa', studentIds: [ST], countRoles });
  });

  it('another assistant is 404 on every route; nothing stored or marked', async () => {
    for (const res of [
      await t.post(`${SALES}/messages`, 'otherSales', { body: 'x' }),
      await t.post(`${SALES}/read`, 'otherSales', {}),
      await t.call('GET', `${SALES}/unread`, 'otherSales'),
    ]) {
      expect([res.statusCode, res.json().code]).toEqual([404, 'student_not_found']);
    }
    expect(t.queries.insert).not.toHaveBeenCalled();
    expect(t.queries.setReadMark).not.toHaveBeenCalled();
  });

  it('the admin stays a monitor: no post route of its own, the assistant route refused', async () => {
    expect((await t.post(`/students/${ST}/channel/messages`, 'admin', { body: 'x' })).statusCode).toBe(404);
    expect((await t.post(`${SALES}/messages`, 'admin', { body: 'x' })).statusCode).toBe(403);
    expect((await t.call('GET', `/students/${ST}/channel/messages`, 'admin')).json().read_only).toBe(true);
    expect(t.queries.insert).not.toHaveBeenCalled();
  });

  it('closed: she still reads the history (read-only); a write is 409 channel_not_open', async () => {
    t.queries.isOpen.mockResolvedValue(false);
    const page = (await t.call('GET', `${SALES}/messages`, 'sales')).json();
    expect([page.open, page.read_only, page.messages.length]).toEqual([false, true, 1]);
    expect((await t.post(`${SALES}/messages`, 'sales', { body: 'x' })).statusCode).toBe(409);
    expect(t.queries.insert).not.toHaveBeenCalled();
  });

  it('a bad student id is 400; an empty body is 400', async () => {
    expect((await t.post('/sales/students/nope/channel/messages', 'sales', { body: 'x' })).statusCode).toBe(400);
    expect((await t.post(`${SALES}/messages`, 'sales', { body: '  ' })).statusCode).toBe(400);
    expect(t.queries.insert).not.toHaveBeenCalled();
  });
});
