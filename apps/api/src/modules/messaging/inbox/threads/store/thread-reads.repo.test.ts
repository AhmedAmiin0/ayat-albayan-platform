import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { ThreadReadsRepo } from './thread-reads.repo';

// A family's message to the calls number (docs/28 §10) never gets a read receipt (the calls number
// sends nothing).

const PHONE = '+201001234567';
const queries = (db: ReturnType<typeof fakeDb>['db']) => new ThreadReadsRepo(db);

describe('ThreadReadsRepo and the calls number', () => {
  it('markInboundRead: no read mark for a calls-line message (no read receipt from the calls number)', async () => {
    const read = [
      { wa_message_id: 'wamid.CALLS', created_at: '2026-10-27T09:00:00Z', line: 'calls' },
      { wa_message_id: 'wamid.CHAT', created_at: '2026-10-27T08:00:00Z', line: 'chat' },
    ];
    const { db } = fakeDb({ messages: [{ data: read }] });
    const marks = await queries(db).markInboundRead(PHONE, new Date('2026-10-27T10:00:00Z'));
    expect(JSON.stringify(marks)).not.toContain('wamid.CALLS');
    expect(JSON.stringify(marks)).toContain('wamid.CHAT');
  });
});
