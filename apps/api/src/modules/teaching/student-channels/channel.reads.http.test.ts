import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CH, channelApp, messageRow, ST } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const M = 'f6000000-0000-4000-8000-000000000001';
const SENT = '2026-10-27T10:00:00.123456+00:00';
const PORTAL = `/portal/students/${ST}/channel`;
const reads = (base: string) => `${base}/messages/${M}/reads`;

// Read ticks and message info: current members against their read marks, to the microsecond.
describe('student channel read state over HTTP', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    t.queries.isOpen.mockResolvedValue(true);
    t.edits.message.mockResolvedValue(messageRow({ id: M, sender_profile_id: 'p-g', created_at: SENT }));
    t.reads.marks.mockResolvedValue([
      { profile_id: 'p-t1', last_read_at: '2026-10-27T10:05:00+00:00' },
      // 0.4 µs… before the message: not read (a Date would say read).
      { profile_id: 'p-s', last_read_at: '2026-10-27T10:00:00.123400+00:00' },
    ]);
  });

  it('who read the message (with when) and who not yet, the sender aside', async () => {
    const res = await t.call('GET', reads(PORTAL), 'guardian');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      read: [{ name: 'أبرار', role: 'teacher', at: '2026-10-27T10:05:00+00:00' }],
      unread: [{ name: '', role: 'student' }, { name: '', role: 'sales' }],
    });
    expect(t.reads.marks).toHaveBeenCalledWith(CH);
  });

  it('the teacher, the assistant and the admin monitor ask too; another channel’s id is 404', async () => {
    const routes = [
      [reads(`/teachers/me/channels/${ST}`), 'teacher'],
      [reads(`/sales/students/${ST}/channel`), 'sales'],
      [reads(`/students/${ST}/channel`), 'admin'],
    ] as const;
    for (const [url, who] of routes) expect([who, (await t.call('GET', url, who)).statusCode]).toEqual([who, 200]);
    t.edits.message.mockResolvedValueOnce(null);
    const res = await t.call('GET', reads(PORTAL), 'guardian');
    expect([res.statusCode, res.json().code]).toEqual([404, 'message_not_found']);
  });

  it('a closed channel: 409 for a participant; another family’s student 404', async () => {
    t.queries.isOpen.mockResolvedValue(false);
    expect((await t.call('GET', reads(PORTAL), 'guardian')).statusCode).toBe(409);
    expect((await t.call('GET', reads(PORTAL), 'otherGuardian')).statusCode).toBe(404);
  });

  it('✓✓ on my message once every other member read it; never on another’s', async () => {
    t.queries.page.mockResolvedValue([
      messageRow({ id: 'mine', sender_profile_id: 'p-g', created_at: SENT }),
      messageRow({ id: 'theirs', sender_profile_id: 'p-t1', sender_role: 'teacher', created_at: SENT }),
    ]);
    const all = ['p-t1', 'p-s', 'p-sa'].map((profile_id) => ({ profile_id, last_read_at: SENT }));
    t.reads.marks.mockResolvedValueOnce(all);
    const ticks = (await t.call('GET', `${PORTAL}/messages`, 'guardian')).json().messages;
    expect(ticks.map((m: { id: string; read_by_all: boolean }) => [m.id, m.read_by_all])).toEqual([
      ['theirs', false], ['mine', true],
    ]);
    // One member (p-s) still before it: no ✓✓; a failing read lookup shows none, the page loads.
    const page = await t.call('GET', `${PORTAL}/messages`, 'guardian');
    expect(page.json().messages[1].read_by_all).toBe(false);
    t.reads.marks.mockRejectedValueOnce(new Error('down'));
    expect((await t.call('GET', `${PORTAL}/messages`, 'guardian')).statusCode).toBe(200);
    t.queries.page.mockReset();
  });

  it('a read mark keeps the microseconds of the newest message shown (bug: the newest stayed unread)', async () => {
    expect((await t.post(`${PORTAL}/read`, 'guardian', { at: SENT })).statusCode).toBe(204);
    expect(t.queries.setReadMark).toHaveBeenCalledWith({ channelId: CH, profileId: 'p-g', at: SENT });
  });
});
