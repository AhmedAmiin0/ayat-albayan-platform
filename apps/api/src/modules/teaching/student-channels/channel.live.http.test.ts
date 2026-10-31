import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { channelApp, messageRow, ST } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const PAGE = `/portal/students/${ST}/channel/messages`;

// The channel is live by re-reading (CHANNEL_REFRESH_MS): the other side's next read shows each
// change.
describe('edits and deletes reach the other side on its next read', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => vi.clearAllMocks());

  it('the page carries «تم التعديل» and «تم حذف هذه الرسالة», never a deleted text', async () => {
    t.queries.page.mockResolvedValueOnce([
      messageRow({
        id: 'b',
        body: '-',
        sender_profile_id: 'p-t1',
        sender_role: 'teacher',
        deleted_at: '2026-10-27T12:00:00.000Z',
        created_at: '2026-10-27T11:00:00.000Z',
      }),
      messageRow({ id: 'a', body: 'متى الحلقة؟', edited_at: '2026-10-27T10:05:00.000Z' }),
    ]);
    const messages = (await t.call('GET', PAGE, 'guardian')).json().messages;
    expect(
      messages.map((m: { id: string; body: string; edited: boolean; deleted: boolean }) => [
        m.id,
        m.body,
        m.edited,
        m.deleted,
      ]),
    ).toEqual([
      ['a', 'متى الحلقة؟', true, false],
      ['b', '', false, true],
    ]);
  });

  it("a deleted newest message: the teacher's list preview is the placeholder; unread unchanged", async () => {
    t.queries.summaries.mockResolvedValueOnce([
      {
        student_id: ST,
        unread: 2,
        last_body: '-',
        last_role: 'guardian',
        last_at: '2026-10-27T10:00:00.000Z',
        last_deleted: true,
      },
    ]);
    const [row] = (await t.call('GET', '/teachers/me/channels', 'teacher')).json();
    expect([row.last_message, row.unread]).toEqual([
      { body: '', sender_role: 'guardian', created_at: '2026-10-27T10:00:00.000Z', deleted: true },
      2,
    ]);
  });
});
