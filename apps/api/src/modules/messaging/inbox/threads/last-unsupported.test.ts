import { describe, expect, it } from 'vitest';
import { callsOf, chainDb } from '@/modules/messaging/reminders/chain-db.fake';
import { threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import { markUnsupported } from './last-unsupported';
import { toThreadView } from './threads.mapper';

// The chats list words a last message that does not show its own content: Meta's 131060 (owner
// 2026-10-27), a deleted one, the ad's welcome and an unsupported echo (owner 2026-10-30).
const UNAVAILABLE = { type: 'unsupported', errors: [{ code: 131060 }] };
const NOW = new Date('2026-10-27T10:00:00Z');
const last = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  direction: 'inbound',
  interactive_payload: null,
  deleted_at: null,
  ...over,
});

describe('markUnsupported', () => {
  it('reads the page’s last messages once, and marks the unsupported inbound ones', async () => {
    const data = [
      last('m1', { interactive_payload: UNAVAILABLE }),
      last('m2', { interactive_payload: { type: 'location' } }),
      last('m3'),
    ];
    const { db, log } = chainDb({ messages: [{ data }] });
    const rows = [
      threadRow({ last_message_id: 'm1', last_body: null }),
      threadRow({ last_message_id: 'm2', last_body: null, phone_e164: '+966500000002' }),
      threadRow({ last_message_id: 'm3', last_body: 'السلام عليكم' }),
    ];
    const out = await markUnsupported(db, rows);
    expect(callsOf(log, 'messages')).toEqual([
      ['select', ['id, direction, interactive_payload, deleted_at']],
      ['in', ['id', ['m1', 'm2', 'm3']]],
    ]);
    expect(out.map((r) => r.last_unsupported ?? false)).toEqual([true, false, false]);
    expect(toThreadView(out[0] ?? threadRow(), NOW).last_unsupported).toBe(true);
    expect(toThreadView(out[2] ?? threadRow(), NOW)).not.toHaveProperty('last_unsupported');
    expect(toThreadView(out[2] ?? threadRow(), NOW)).not.toHaveProperty('last_note');
  });

  it('a deleted last message is a note: its text and file are not in the list', async () => {
    const data = [last('m1', { direction: 'outbound', deleted_at: '2026-10-30T10:00:00Z' })];
    const { db } = chainDb({ messages: [{ data }] });
    const row = threadRow({
      last_message_id: 'm1',
      last_body: 'سر',
      last_media_mime: 'image/jpeg',
    });
    const [out] = await markUnsupported(db, [row]);
    const view = toThreadView(out ?? threadRow(), NOW);
    expect(view).toMatchObject({ last_note: 'deleted', last_body: null, last_media_mime: null });
  });

  it("the ad's welcome shows its own text, else none; an unsupported echo is a note", async () => {
    const data = [
      last('m1', {
        direction: 'outbound',
        interactive_payload: { type: 'errors', welcome: 'أهلًا' },
      }),
      last('m2', { direction: 'outbound', interactive_payload: { type: 'errors', welcome: null } }),
      last('m3', { direction: 'outbound', interactive_payload: { type: 'unsupported' } }),
    ];
    const { db } = chainDb({ messages: [{ data }] });
    const ids = ['m1', 'm2', 'm3'];
    const rows = ids.map((id) =>
      threadRow({ last_message_id: id, last_body: null, last_direction: 'outbound' }),
    );
    const out = await markUnsupported(db, rows);
    expect(out.map((r) => [r.last_note, r.last_body])).toEqual([
      ['ad_welcome', 'أهلًا'],
      ['ad_welcome', null],
      ['unsupported', null],
    ]);
  });

  it('an empty page reads nothing', async () => {
    const { db, log } = chainDb();
    expect(await markUnsupported(db, [])).toEqual([]);
    expect(log).toEqual([]);
  });
});
