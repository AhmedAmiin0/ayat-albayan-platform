import { describe, expect, it } from 'vitest';
import { callsOf, chainDb } from '../../reminders/chain-db.fake';
import { threadRow } from '../inbox.fakes';
import { markUnsupported } from './last-unsupported';
import { toThreadView } from './threads.mapper';

// The chats list words a last message whose content never arrived (Meta's 131060, owner 2026-10-27).
const UNAVAILABLE = { type: 'unsupported', errors: [{ code: 131060 }] };
const NOW = new Date('2026-10-27T10:00:00Z');

describe('markUnsupported', () => {
  it('reads the payload of the empty inbound last messages only, and marks the unsupported ones', async () => {
    const { db, log } = chainDb({ messages: [{ data: [{ id: 'm1', interactive_payload: UNAVAILABLE }, { id: 'm2', interactive_payload: { type: 'location' } }] }] });
    const rows = [
      threadRow({ last_message_id: 'm1', last_body: null }),
      threadRow({ last_message_id: 'm2', last_body: null, phone_e164: '+966500000002' }),
      threadRow({ last_message_id: 'm3', last_body: 'السلام عليكم' }),
    ];
    const out = await markUnsupported(db, rows);
    expect(callsOf(log, 'messages')).toEqual([
      ['select', ['id, interactive_payload']],
      ['in', ['id', ['m1', 'm2']]],
    ]);
    expect(out.map((r) => r.last_unsupported ?? false)).toEqual([true, false, false]);
    expect(toThreadView(out[0] ?? rows[0], NOW).last_unsupported).toBe(true);
    expect(toThreadView(out[2] ?? rows[0], NOW)).not.toHaveProperty('last_unsupported');
  });

  it('a page with text, files and templates only reads nothing more', async () => {
    const { db, log } = chainDb();
    await markUnsupported(db, [threadRow(), threadRow({ last_body: null, last_media_mime: 'image/jpeg' }), threadRow({ last_body: null, last_direction: 'outbound' })]);
    expect(log).toEqual([]);
  });
});
