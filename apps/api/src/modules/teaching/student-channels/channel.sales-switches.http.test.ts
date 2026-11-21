import { CHANNEL_NOT_OPEN, FAMILY_CHAT_OFF } from '@ab/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { channelApp, ST } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const SALES = `/sales/students/${ST}/channel`;
const PORTAL = `/portal/students/${ST}/channel`;

// Review finding 2: the assistant writes only while settings.family_chat_enabled is on (403
// family_chat_off otherwise, her page read-only so no composer), and the teachers hear a chat
// message only while teacher_student_messages_enabled shows them the page.
// Finding 6: a write on a channel that closed after her page loaded is 409 channel_not_open.
describe('the seated assistant and the two chat switches over HTTP', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    t.queries.isOpen.mockResolvedValue(true);
  });
  const switches = (family: boolean, teachers: boolean) => {
    t.familyChat.enabled.mockResolvedValue(family);
    t.teacherChat.enabled.mockResolvedValue(teachers);
  };
  const pushedTo = () => t.push.notifyProfiles.mock.calls.map(([target]) => target.profileIds);
  const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

  for (const teachers of [false, true]) {
    it(`family chat off, teachers ${teachers ? 'on' : 'off'}: her writes are 403 family_chat_off, nothing stored or pushed`, async () => {
      switches(false, teachers);
      for (const res of [
        await t.post(`${SALES}/messages`, 'sales', { body: 'موعد التجديد' }),
        await t.post(`${SALES}/read`, 'sales', {}),
      ]) {
        expect([res.statusCode, res.json().code]).toEqual([403, FAMILY_CHAT_OFF]);
      }
      await settled();
      expect(t.queries.insert).not.toHaveBeenCalled();
      expect(t.queries.setReadMark).not.toHaveBeenCalled();
      expect(t.push.notifyProfiles).not.toHaveBeenCalled();
    });
  }

  it('family chat off: her page is read-only (no composer) and her unread is 0', async () => {
    switches(false, true);
    const page = (await t.call('GET', `${SALES}/messages`, 'sales')).json();
    expect([page.read_only, page.open, page.messages.length]).toEqual([true, true, 1]);
    expect((await t.call('GET', `${SALES}/unread`, 'sales')).json()).toEqual({ unread: 0 });
  });

  it('family chat on, teachers off: she posts; the family hears it, the teacher gets no push or bell', async () => {
    switches(true, false);
    expect((await t.post(`${SALES}/messages`, 'sales', { body: 'x' })).statusCode).toBe(201);
    await settled();
    expect(pushedTo()).toEqual([['p-g', 'p-s']]);
  });

  it('family chat on, teachers on: the teacher and the family hear her', async () => {
    switches(true, true);
    expect((await t.post(`${SALES}/messages`, 'sales', { body: 'x' })).statusCode).toBe(201);
    await settled();
    expect(pushedTo()).toEqual([['p-t1', 'p-g', 'p-s']]);
  });

  it('teachers off: a family message reaches the assistant, never the teacher', async () => {
    switches(true, false);
    expect((await t.post(`${PORTAL}/messages`, 'guardian', { body: 'x' })).statusCode).toBe(201);
    await settled();
    expect(pushedTo()).toEqual([['p-s', 'p-sa']]);
  });

  it('closed after her page loaded: post and read are 409 channel_not_open', async () => {
    switches(true, true);
    t.queries.isOpen.mockResolvedValue(false);
    for (const res of [
      await t.post(`${SALES}/messages`, 'sales', { body: 'x' }),
      await t.post(`${SALES}/read`, 'sales', {}),
    ]) {
      expect([res.statusCode, res.json().code]).toEqual([409, CHANNEL_NOT_OPEN]);
    }
    expect(t.queries.insert).not.toHaveBeenCalled();
  });
});
