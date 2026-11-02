import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { channelApp, messageRow, ST } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const M = 'd4000000-0000-4000-8000-000000000001';
const PORTAL = `/portal/students/${ST}/channel/messages/${M}`;
const TEACHER = `/teachers/me/channels/${ST}/messages/${M}`;
const ADMIN = `/students/${ST}/channel/messages/${M}`;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const HOUR = 3_600_000;

// Owner 2026-10-30: the sender deletes for everyone within 48 hours; the admin deletes any
// (moderation).
describe('DELETE …/messages/:id: delete for everyone', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    t.edits.message.mockResolvedValue(
      messageRow({
        id: M,
        sender_profile_id: 'p-t1',
        sender_role: 'teacher',
        created_at: ago(47 * HOUR),
      }),
    );
  });

  it('the sender within 48 hours: body gone, «تم حذف هذه الرسالة», text kept in the history, audited', async () => {
    const res = await t.call('DELETE', TEACHER, 'teacher');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: M, body: '', deleted: true, edited: false });
    expect(t.edits.remove).toHaveBeenCalledWith(
      expect.objectContaining({ id: M, actor: 'p-t1', previous: 'السلام عليكم' }),
    );
    expect(t.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'channel_message_deleted',
        after: expect.objectContaining({ moderator: false }),
      }),
    );
  });

  it('after 48 hours: 403 delete_window_closed; another participant: 403 not_your_message', async () => {
    t.edits.message.mockResolvedValueOnce(
      messageRow({ id: M, sender_profile_id: 'p-t1', created_at: ago(48 * HOUR + 2000) }),
    );
    expect((await t.call('DELETE', TEACHER, 'teacher')).json().code).toBe('delete_window_closed');
    expect((await t.call('DELETE', PORTAL, 'guardian')).json().code).toBe('not_your_message');
    expect(t.edits.remove).not.toHaveBeenCalled();
  });

  it('the admin deletes any message, any age (moderation), audited as such', async () => {
    t.edits.message.mockResolvedValueOnce(
      messageRow({ id: M, sender_profile_id: 'p-g', created_at: ago(900 * HOUR) }),
    );
    const res = await t.call('DELETE', ADMIN, 'admin');
    expect([res.statusCode, res.json().deleted]).toEqual([200, true]);
    expect(t.edits.remove).toHaveBeenCalledWith(expect.objectContaining({ id: M, actor: 'p-ad' }));
    expect(t.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'p-ad',
        after: expect.objectContaining({ moderator: true }),
      }),
    );
  });

  it('other monitors cannot delete: sales on the admin route 403, the owning assistant has no route', async () => {
    expect((await t.call('DELETE', ADMIN, 'sales')).statusCode).toBe(403);
    expect(
      (await t.call('DELETE', `/sales/students/${ST}/channel/messages/${M}`, 'sales')).statusCode,
    ).toBe(404);
    expect((await t.call('DELETE', TEACHER, 'oldTeacher')).statusCode).toBe(404);
    expect(t.edits.remove).not.toHaveBeenCalled();
  });

  it('already deleted: 409 message_deleted', async () => {
    t.edits.message.mockResolvedValueOnce(
      messageRow({ id: M, sender_profile_id: 'p-t1', created_at: ago(HOUR), deleted_at: ago(0) }),
    );
    expect((await t.call('DELETE', TEACHER, 'teacher')).json().code).toBe('message_deleted');
  });
});
