import { FAMILY_CHAT_OFF } from '@ab/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { channelApp, OTHER, ST } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const PORTAL = `/portal/students/${ST}/channel`;
const M = 'a1000000-0000-4000-8000-000000000001';

// docs/50 §2: «all chat in app is turned off by default from the config». While
// settings.family_chat_enabled is off, every family channel route is 403 family_chat_off.
describe('family chat switch (settings.family_chat_enabled) over HTTP', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    t.familyChat.enabled.mockResolvedValue(false);
  });

  it('off: every family read and write is 403 family_chat_off, nothing read or stored', async () => {
    const calls = [
      t.call('GET', `${PORTAL}/messages`, 'guardian'),
      t.post(`${PORTAL}/messages`, 'guardian', { body: 'السلام عليكم' }),
      t.post(`${PORTAL}/read`, 'guardian', {}),
      t.call('GET', `${PORTAL}/unread`, 'student'),
      t.call('GET', `${PORTAL}/presence`, 'guardian'),
      t.patch(`${PORTAL}/messages/${M}`, 'guardian', { body: 'تعديل' }),
      t.call('DELETE', `${PORTAL}/messages/${M}`, 'guardian'),
    ];
    for (const res of await Promise.all(calls)) {
      expect([res.statusCode, res.json().code]).toEqual([403, FAMILY_CHAT_OFF]);
    }
    expect(t.queries.page).not.toHaveBeenCalled();
    expect(t.queries.insert).not.toHaveBeenCalled();
    expect(t.queries.setReadMark).not.toHaveBeenCalled();
    expect(t.edits.edit).not.toHaveBeenCalled();
  });

  it('off: a family post pushes nothing to the teacher', async () => {
    await t.post(`${PORTAL}/messages`, 'guardian', { body: 'متى الحلقة؟' });
    expect(t.push.notifyProfiles).not.toHaveBeenCalled();
  });

  it("off: another family's student is still 404 (the scope is checked first)", async () => {
    const res = await t.call('GET', `/portal/students/${OTHER}/channel/messages`, 'guardian');
    expect([res.statusCode, res.json().code]).toEqual([404, 'student_not_found']);
  });

  it('off: the teacher side keeps its own switch and still reads', async () => {
    expect(
      (await t.call('GET', `/teachers/me/channels/${ST}/messages`, 'teacher')).statusCode,
    ).toBe(200);
  });

  it('on: the family reads and posts as before', async () => {
    t.familyChat.enabled.mockResolvedValue(true);
    expect((await t.call('GET', `${PORTAL}/messages`, 'guardian')).statusCode).toBe(200);
    expect((await t.post(`${PORTAL}/messages`, 'guardian', { body: 'شكرًا' })).statusCode).toBe(201);
    expect(t.push.notifyProfiles).toHaveBeenCalledTimes(1);
  });
});
