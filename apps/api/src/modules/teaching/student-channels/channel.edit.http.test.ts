import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { channelApp, CH, messageRow, ST } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const M = 'd4000000-0000-4000-8000-000000000001';
const PORTAL = `/portal/students/${ST}/channel/messages/${M}`;
const TEACHER = `/teachers/me/channels/${ST}/messages/${M}`;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const MIN = 60_000;

// Owner 2026-10-30: the sender edits within 15 minutes; every rule is the server's.
describe('PATCH …/messages/:id: edit in the student channel', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    t.edits.message.mockResolvedValue(
      messageRow({ id: M, sender_profile_id: 'p-g', created_at: ago(5 * MIN) }),
    );
  });

  it('the sender edits within 15 minutes: earlier text to the history, «تم التعديل», audited', async () => {
    const res = await t.patch(PORTAL, 'guardian', { body: '  متى الحلقة؟  ' });
    expect(res.statusCode).toBe(200);
    expect(t.edits.message).toHaveBeenCalledWith({ channelId: CH, id: M });
    expect(t.edits.edit).toHaveBeenCalledWith(
      expect.objectContaining({
        id: M,
        actor: 'p-g',
        body: 'متى الحلقة؟',
        previous: 'السلام عليكم',
      }),
    );
    expect(res.json()).toMatchObject({
      id: M,
      body: 'متى الحلقة؟',
      edited: true,
      deleted: false,
      mine: true,
    });
    expect(t.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'channel_messages',
        entityId: M,
        action: 'channel_message_edited',
        actorId: 'p-g',
      }),
    );
  });

  it('after 15 minutes: 403 edit_window_closed, nothing written', async () => {
    t.edits.message.mockResolvedValue(
      messageRow({ id: M, sender_profile_id: 'p-g', created_at: ago(15 * MIN + 2000) }),
    );
    const res = await t.patch(PORTAL, 'guardian', { body: 'x' });
    expect([res.statusCode, res.json().code]).toEqual([403, 'edit_window_closed']);
    expect(t.edits.edit).not.toHaveBeenCalled();
  });

  it("someone else's message: 403 not_your_message (the teacher cannot edit the guardian's text)", async () => {
    const res = await t.patch(TEACHER, 'teacher', { body: 'x' });
    expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_message']);
    expect(t.edits.edit).not.toHaveBeenCalled();
  });

  it("a deleted message is 409 message_deleted; an unknown or other channel's id is 404", async () => {
    t.edits.message.mockResolvedValueOnce(
      messageRow({ id: M, sender_profile_id: 'p-g', created_at: ago(MIN), deleted_at: ago(0) }),
    );
    expect((await t.patch(PORTAL, 'guardian', { body: 'x' })).json().code).toBe(
      'message_deleted',
    );
    t.edits.message.mockResolvedValueOnce(null);
    expect((await t.patch(PORTAL, 'guardian', { body: 'x' })).json().code).toBe(
      'message_not_found',
    );
  });

  it('deleted meanwhile (compare-and-set lost): 409; an empty body is 400; monitors have no edit route', async () => {
    t.edits.edit.mockResolvedValueOnce(null);
    expect((await t.patch(PORTAL, 'guardian', { body: 'x' })).statusCode).toBe(409);
    expect((await t.patch(PORTAL, 'guardian', { body: '  ' })).statusCode).toBe(400);
    expect(
      (await t.patch(`/students/${ST}/channel/messages/${M}`, 'admin', { body: 'x' }))
        .statusCode,
    ).toBe(404);
    expect(t.audit.record).not.toHaveBeenCalled();
  });
});
