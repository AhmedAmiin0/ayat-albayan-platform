import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { channelApp, messageRow, ST } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const PORTAL = `/portal/students/${ST}/channel`;
const CLIENT = 'a7000000-0000-4000-8000-000000000001';

// Once the row is stored the message is sent: what follows never turns it into a 500, and a
// resend (same client_id) answers the stored message without pushing again.
describe('student channel sends: safe to repeat, never a 500 after the insert', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    t.queries.isOpen.mockResolvedValue(true);
  });

  it('the client id is stored; a resend returns the stored message, no read mark, no push', async () => {
    await t.post(`${PORTAL}/messages`, 'guardian', { body: 'سلام', client_id: CLIENT });
    expect(t.queries.insert).toHaveBeenCalledWith(expect.objectContaining({ client_id: CLIENT }));
    vi.clearAllMocks();
    const stored = messageRow({ id: 'm9', sender_profile_id: 'p-g', client_id: CLIENT });
    t.queries.insert.mockResolvedValueOnce({ row: stored, created: false });
    const res = await t.post(`${PORTAL}/messages`, 'guardian', { body: 'سلام', client_id: CLIENT });
    expect([res.statusCode, res.json().id, res.json().client_id]).toEqual([201, 'm9', CLIENT]);
    expect(t.queries.setReadMark).not.toHaveBeenCalled();
    expect(t.push.notifyProfiles).not.toHaveBeenCalled();
  });

  it('a resend whose quoted message was deleted since: the stored row, no reply check', async () => {
    const stored = messageRow({ id: 'm9', sender_profile_id: 'p-g', client_id: CLIENT });
    t.queries.byClientId.mockResolvedValueOnce(stored);
    t.edits.message.mockResolvedValueOnce(null);
    const post = {
      body: 'نعم',
      reply_to_id: 'a7000000-0000-4000-8000-000000000002',
      client_id: CLIENT,
    };
    const res = await t.post(`${PORTAL}/messages`, 'guardian', post);
    expect([res.statusCode, res.json().id]).toEqual([201, 'm9']);
    expect(t.queries.byClientId).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: 'p-g', clientId: CLIENT }),
    );
    expect(t.edits.message).not.toHaveBeenCalled();
    expect(t.queries.insert).not.toHaveBeenCalled();
    expect(t.push.notifyProfiles).not.toHaveBeenCalled();
  });

  it('a failing read mark, push or name lookup after the insert: still 201 with the message', async () => {
    t.queries.setReadMark.mockRejectedValueOnce(new Error('db down'));
    t.push.notifyProfiles.mockRejectedValueOnce(new Error('push down'));
    t.people.names.mockRejectedValue(new Error('names down'));
    const res = await t.post(`${PORTAL}/messages`, 'guardian', { body: 'سلام' });
    expect([res.statusCode, res.json().id, res.json().body]).toEqual([201, 'm2', 'سلام']);
    t.people.names.mockReset();
    t.people.names.mockResolvedValue(
      new Map([
        ['p-g', 'أم سلمى'],
        ['p-t1', 'أبرار'],
      ]),
    );
  });

  it('a closed page says why: the reason from the student, null while open', async () => {
    t.queries.isOpen.mockResolvedValue(false);
    t.queries.closedReason.mockResolvedValueOnce('no_teacher');
    const closed = (await t.call('GET', `${PORTAL}/messages`, 'guardian')).json();
    expect([closed.open, closed.closed_reason]).toEqual([false, 'no_teacher']);
    t.queries.isOpen.mockResolvedValue(true);
    const open = (await t.call('GET', `${PORTAL}/messages`, 'guardian')).json();
    expect([open.open, open.closed_reason]).toEqual([true, null]);
    expect(t.queries.closedReason).toHaveBeenCalledTimes(1);
  });
});
