import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { channelApp, messageRow, ST } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const M = 'b8000000-0000-4000-8000-000000000001';
const PORTAL = `/portal/students/${ST}/channel/messages/${M}`;
const now = () => new Date().toISOString();

// The chat upgrade's edit / delete rules: the open rule for participants, text-only edits, and
// the recipients' bell rows follow the change.
describe('student channel edit / delete: open channel, text only, bell rows', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    t.queries.isOpen.mockResolvedValue(true);
    t.edits.message.mockResolvedValue(messageRow({ id: M, created_at: now() }));
  });

  it('a closed channel: a participant’s edit or delete is 409 channel_not_open, nothing changed', async () => {
    t.queries.isOpen.mockResolvedValue(false);
    const edit = await t.patch(PORTAL, 'guardian', { body: 'تعديل' });
    const del = await t.call('DELETE', PORTAL, 'guardian');
    for (const res of [edit, del])
      expect([res.statusCode, res.json().code]).toEqual([409, 'channel_not_open']);
    expect(t.edits.edit).not.toHaveBeenCalled();
    expect(t.edits.remove).not.toHaveBeenCalled();
    // The admin's moderation still deletes on a closed channel.
    expect(
      (await t.call('DELETE', `/students/${ST}/channel/messages/${M}`, 'admin')).statusCode,
    ).toBe(200);
  });

  it('a photo, PDF or voice note is never edited (403 not_a_text_message), still deleted', async () => {
    t.edits.message.mockResolvedValue(
      messageRow({ id: M, created_at: now(), kind: 'photo', body: '' }),
    );
    const res = await t.patch(PORTAL, 'guardian', { body: 'تعليق' });
    expect([res.statusCode, res.json().code]).toEqual([403, 'not_a_text_message']);
    expect((await t.call('DELETE', PORTAL, 'guardian')).statusCode).toBe(200);
  });

  it('an edit rewrites the recipients’ bell rows with the new text; a delete with the deleted line', async () => {
    await t.patch(PORTAL, 'guardian', { body: 'النص الجديد' });
    expect(t.bell.rewrite).toHaveBeenCalledWith({ messageId: M, body: 'أم سلمى: النص الجديد' });
    await t.call('DELETE', PORTAL, 'guardian');
    expect(t.bell.rewrite).toHaveBeenLastCalledWith({
      messageId: M,
      body: 'أم سلمى: تم حذف هذه الرسالة',
    });
  });

  it('a failing bell rewrite never fails the change', async () => {
    t.bell.rewrite.mockRejectedValueOnce(new Error('db down'));
    expect((await t.patch(PORTAL, 'guardian', { body: 'نص' })).statusCode).toBe(200);
  });
});
