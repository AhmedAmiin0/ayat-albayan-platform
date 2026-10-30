import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CH, channelApp, ST, type Who } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const TEACHER = `/teachers/me/channels/${ST}`;
const PORTAL = `/portal/students/${ST}/channel`;

// Owner 2026-10-29: the channel opens once the student is subscribed AND the assistant assigned the teacher
// (channel_is_open). Before that the participants get an empty closed state and every write is 409.
describe('student channel: closed before the subscription and the assignment', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    t.queries.isOpen.mockResolvedValue(false);
  });

  it('closed: the teacher and the family read an empty closed page, no message is listed', async () => {
    for (const [who, base] of [['teacher', TEACHER], ['guardian', PORTAL]] as [Who, string][]) {
      const page = (await t.call('GET', `${base}/messages`, who)).json();
      expect([who, page.open, page.messages, page.channel_id]).toEqual([who, false, [], CH]);
    }
    expect(t.queries.page).not.toHaveBeenCalled();
    expect((await t.call('GET', `${PORTAL}/unread`, 'guardian')).json()).toEqual({ unread: 0 });
  });

  it('closed: a post or a read mark is 409 channel_not_open; nothing stored, nobody pushed', async () => {
    for (const [who, base] of [['teacher', TEACHER], ['guardian', PORTAL]] as [Who, string][]) {
      const res = await t.post(`${base}/messages`, who, { body: 'السلام عليكم' });
      expect([who, res.statusCode, res.json().code]).toEqual([who, 409, 'channel_not_open']);
      expect((await t.post(`${base}/read`, who, {})).statusCode).toBe(409);
    }
    expect(t.queries.insert).not.toHaveBeenCalled();
    expect(t.queries.setReadMark).not.toHaveBeenCalled();
    expect(t.push.notifyProfiles).not.toHaveBeenCalled();
  });

  it('closed: monitors still read the history', async () => {
    const page = (await t.call('GET', `/students/${ST}/channel/messages`, 'admin')).json();
    expect([page.open, page.read_only, page.messages.length]).toEqual([false, true, 1]);
    expect((await t.call('GET', `/sales/students/${ST}/channel/messages`, 'sales')).json().messages).toHaveLength(1);
  });

  it('open after the subscription and the assignment: the same routes list and post', async () => {
    t.queries.isOpen.mockResolvedValue(true);
    expect((await t.call('GET', `${TEACHER}/messages`, 'teacher')).json()).toMatchObject({ open: true, channel_id: CH });
    expect((await t.post(`${PORTAL}/messages`, 'guardian', { body: 'السلام عليكم' })).statusCode).toBe(201);
    expect(t.queries.isOpen).toHaveBeenCalledWith(ST);
  });

  it('the family side: the guardian and a contact_is_self student chat; a child’s own login is 403', async () => {
    t.queries.isOpen.mockResolvedValue(true);
    expect((await t.call('GET', `${PORTAL}/messages`, 'student')).statusCode).toBe(200);
    for (const route of ['messages', 'unread']) {
      const res = await t.call('GET', `${PORTAL}/${route}`, 'child');
      expect([route, res.statusCode, res.json().code]).toEqual([route, 403, 'channel_guardian_only']);
    }
    expect((await t.post(`${PORTAL}/messages`, 'child', { body: 'x' })).statusCode).toBe(403);
    expect(t.queries.insert).not.toHaveBeenCalled();
  });
});
