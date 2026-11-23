import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { channelApp, messageRow, ST } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const PORTAL = `/portal/students/${ST}/channel`;
const ORIGINAL = 'e5000000-0000-4000-8000-000000000001';

// A reply keeps a snapshot of the message it answers, taken at send time.
describe('student channel replies over HTTP', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => vi.clearAllMocks());

  it('the quoted text, kind, sender name and role are stored with the reply', async () => {
    t.edits.message.mockResolvedValueOnce(
      messageRow({ id: ORIGINAL, body: 'الحلقة غدًا', sender_profile_id: 'p-t1', sender_role: 'teacher' }),
    );
    const res = await t.post(`${PORTAL}/messages`, 'guardian', { body: 'حسنًا', reply_to_id: ORIGINAL });
    expect(res.statusCode).toBe(201);
    expect(t.queries.insert).toHaveBeenCalledWith(expect.objectContaining({
      reply_to_id: ORIGINAL, quote_body: 'الحلقة غدًا', quote_kind: 'text',
      quote_sender_name: 'أبرار', quote_sender_role: 'teacher',
    }));
    expect(res.json().reply_to).toEqual({
      id: ORIGINAL, sender_name: 'أبرار', sender_role: 'teacher', body: 'الحلقة غدًا', kind: 'text', deleted: false,
    });
  });

  it('a quoted sender whose name is blank is stored with none, never spaces', async () => {
    t.people.names.mockResolvedValueOnce(new Map([['p-t1', ' \t ']]));
    t.edits.message.mockResolvedValueOnce(
      messageRow({ id: ORIGINAL, sender_profile_id: 'p-t1', sender_role: 'teacher' }),
    );
    await t.post(`${PORTAL}/messages`, 'guardian', { body: 'حسنًا', reply_to_id: ORIGINAL });
    const stored = expect.objectContaining({ quote_sender_name: '', quote_sender_role: 'teacher' });
    expect(t.queries.insert).toHaveBeenCalledWith(stored);
  });

  it('a message of another channel, or one deleted for everyone, is 400 reply_not_found', async () => {
    t.edits.message.mockResolvedValueOnce(null);
    t.edits.message.mockResolvedValueOnce(messageRow({ id: ORIGINAL, deleted_at: '2026-10-27T11:00:00.000Z' }));
    for (let i = 0; i < 2; i += 1) {
      const res = await t.post(`${PORTAL}/messages`, 'guardian', { body: 'حسنًا', reply_to_id: ORIGINAL });
      expect([res.statusCode, res.json().code]).toEqual([400, 'reply_not_found']);
    }
    expect(t.queries.insert).not.toHaveBeenCalled();
  });

  it('the original deleted later: the quote shows deleted, without its text', async () => {
    const quote = { reply_to_id: ORIGINAL, quote_body: 'سر', quote_kind: 'text', quote_sender_name: 'أبرار', quote_sender_role: 'teacher' };
    t.queries.page.mockResolvedValueOnce([messageRow({ id: 'r1', ...quote })]);
    t.edits.deletedIds.mockResolvedValueOnce(new Set([ORIGINAL]));
    const page = (await t.call('GET', `${PORTAL}/messages`, 'guardian')).json();
    expect(page.messages[0].reply_to).toMatchObject({ id: ORIGINAL, body: '', deleted: true, sender_name: 'أبرار' });
    expect(t.edits.deletedIds).toHaveBeenCalledWith([ORIGINAL]);
  });
});
