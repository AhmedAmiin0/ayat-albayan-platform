import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CH, channelApp, ST } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const PORTAL = `/portal/students/${ST}/channel/messages`;
const TEACHER = `/teachers/me/channels/${ST}/messages`;
const MONITOR = `/students/${ST}/channel/messages`;
const MARK = '2026-10-27T10:00:00.123456+00:00';

// The page's people and the viewer's read mark come from current members, never a monitor.
describe('a channel page: its participants and my read mark', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    t.queries.isOpen.mockResolvedValue(true);
    t.familyChat.enabled.mockResolvedValue(true);
    t.reads.marks.mockResolvedValue([
      { profile_id: 'p-g', last_read_at: MARK },
      { profile_id: 'p-t1', last_read_at: '2026-10-27T11:00:00+00:00' },
    ]);
  });

  it('the guardian: teacher, family logins and the owning assistant, me flagged; my mark', async () => {
    const page = (await t.call('GET', PORTAL, 'guardian')).json();
    expect(page.participants).toEqual([
      { name: 'أبرار', role: 'teacher', me: false },
      { name: 'أم سلمى', role: 'guardian', me: true },
      { name: '', role: 'student', me: false },
      { name: '', role: 'sales', me: false },
    ]);
    expect(page.my_last_read_at).toBe(MARK);
    expect(t.reads.marks).toHaveBeenCalledWith(CH);
  });

  it('family chat off: only the teacher and the assistant; the teacher is me', async () => {
    t.familyChat.enabled.mockResolvedValue(false);
    const page = (await t.call('GET', TEACHER, 'teacher')).json();
    expect(page.participants).toEqual([
      { name: 'أبرار', role: 'teacher', me: true },
      { name: '', role: 'sales', me: false },
    ]);
    expect(page.my_last_read_at).toBe('2026-10-27T11:00:00+00:00');
  });

  it('no mark yet → null; a monitor is never a participant and has no mark', async () => {
    t.reads.marks.mockResolvedValue([]);
    expect((await t.call('GET', PORTAL, 'guardian')).json().my_last_read_at).toBeNull();
    const seen = (await t.call('GET', MONITOR, 'admin')).json();
    expect(seen.participants.some((p: { me: boolean }) => p.me)).toBe(false);
    expect(seen.my_last_read_at).toBeNull();
  });

  it('a failing read lookup: no people, no mark, the page still loads', async () => {
    t.reads.marks.mockRejectedValueOnce(new Error('down'));
    const res = await t.call('GET', PORTAL, 'guardian');
    expect(res.statusCode).toBe(200);
    expect([res.json().participants, res.json().my_last_read_at]).toEqual([[], null]);
  });
});
