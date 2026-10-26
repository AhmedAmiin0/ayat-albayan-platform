import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { channelApp, CH, messageRow, ST } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const TEACHER = `/teachers/me/channels/${ST}`;
const PORTAL = `/portal/students/${ST}/channel`;

describe('student channel messages over HTTP', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => vi.clearAllMocks());

  it('a family message is stored trimmed with its role, read for the sender, and pushes to the current teacher only', async () => {
    const res = await t.post(`${PORTAL}/messages`, 'guardian', { body: '  متى الحلقة القادمة؟  ' });
    expect(res.statusCode).toBe(201);
    expect(t.queries.insert).toHaveBeenCalledWith({ channel_id: CH, sender_profile_id: 'p-g', sender_role: 'guardian', body: 'متى الحلقة القادمة؟' });
    expect(t.queries.markRead).toHaveBeenCalledWith(expect.objectContaining({ channelId: CH, profileId: 'p-g' }));
    expect(t.push.notifyProfiles).toHaveBeenCalledWith({
      kind: 'channel_message', profileIds: ['p-t1'], subject: 'm2', vars: { student: 'سلمى', text: 'متى الحلقة القادمة؟' }, data: { studentId: ST },
    });
    expect(res.json()).toEqual({ id: 'm2', body: 'متى الحلقة القادمة؟', sender_role: 'guardian', sender_name: 'أم سلمى', mine: true, created_at: '2026-10-27T10:00:00.000Z' });
  });

  it('a teacher message notifies nobody; a student login writes as student', async () => {
    await t.post(`${TEACHER}/messages`, 'teacher', { body: 'الحلقة غدًا' });
    expect(t.queries.insert).toHaveBeenCalledWith(expect.objectContaining({ sender_role: 'teacher', sender_profile_id: 'p-t1' }));
    expect(t.push.notifyProfiles).not.toHaveBeenCalled();
    await t.post(`${PORTAL}/messages`, 'student', { body: 'شكرًا' });
    expect(t.queries.insert).toHaveBeenLastCalledWith(expect.objectContaining({ sender_role: 'student' }));
  });

  it('body limits: empty, blank and over 2000 characters are 400 and nothing is stored', async () => {
    for (const body of [undefined, '', '   ', 'x'.repeat(2001)]) {
      expect((await t.post(`${PORTAL}/messages`, 'guardian', body === undefined ? {} : { body })).statusCode).toBe(400);
    }
    expect((await t.post(`${PORTAL}/messages`, 'guardian', { body: 'x'.repeat(2000) })).statusCode).toBe(201);
    expect(t.queries.insert).toHaveBeenCalledTimes(1);
  });

  it('a page: oldest first, names only (no profile id), mine flagged; before pages back; a bad before is 400', async () => {
    t.queries.page.mockResolvedValueOnce([messageRow({ id: 'b', sender_profile_id: 'p-t1', sender_role: 'teacher', created_at: '2026-10-27T11:00:00.000Z' }), messageRow()]);
    const res = await t.call('GET', `${TEACHER}/messages?before=2026-10-28T00:00:00.000Z`, 'teacher');
    expect(res.json().messages.map((m: { id: string; mine: boolean; sender_name: string }) => [m.id, m.mine, m.sender_name])).toEqual([['m1', false, 'أم سلمى'], ['b', true, 'أبرار']]);
    expect(res.body).not.toMatch(/p-t1|p-g|phone|email/);
    expect(t.queries.page).toHaveBeenCalledWith({ channelId: CH, before: '2026-10-28T00:00:00.000Z' });
    expect((await t.call('GET', `${TEACHER}/messages?before=soon`, 'teacher')).statusCode).toBe(400);
  });

  it('read marks: a participant only; unread counts are per participant', async () => {
    expect((await t.call('POST', `${PORTAL}/read`, 'guardian')).statusCode).toBe(204);
    expect(t.queries.markRead).toHaveBeenCalledWith(expect.objectContaining({ profileId: 'p-g' }));
    expect((await t.call('GET', `${PORTAL}/unread`, 'guardian')).json()).toEqual({ unread: 2 });
    expect(t.queries.summaries).toHaveBeenLastCalledWith({ profileId: 'p-g', studentIds: [ST] });
  });

  it('the teacher list: current students with the last message and their own unread count', async () => {
    const res = await t.call('GET', '/teachers/me/channels', 'teacher');
    expect(res.json()).toEqual([{ student_id: ST, student_name: 'سلمى', student_code: 'AB-0201', unread: 2, last_message: { body: 'السلام عليكم', sender_role: 'guardian', created_at: '2026-10-27T10:00:00.000Z' } }]);
    expect(t.queries.teacherStudentIds).toHaveBeenCalledWith('t1');
    expect(t.queries.summaries).toHaveBeenCalledWith({ profileId: 'p-t1', studentIds: [ST] });
  });
});
