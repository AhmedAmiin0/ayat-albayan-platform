import { describe, expect, it } from 'vitest';
import { callsOf, chainDb } from '@/modules/messaging/reminders/chain-db.fake';
import { PushReceiptsRepo } from './push-receipts.repo';

const ROW = {
  id: 'p1',
  profile_id: 'a1',
  ticket_ids: ['t1'],
  error: null,
  created_at: '2026-10-02T11:00:00.000Z',
};

describe('PushReceiptsRepo', () => {
  it('unchecked: sent in the window with tickets left, with the token each ticket went to', async () => {
    const { db, log } = chainDb({
      push_notifications: [{ data: [{ ...ROW, ticket_tokens: { t1: 'ExponentPushToken[a]' } }] }],
    });
    const range = { from: new Date('2026-10-01T12:00:00Z'), to: new Date('2026-10-02T11:45:00Z') };
    const rows = await new PushReceiptsRepo(db).unchecked(range);
    expect(rows).toEqual([{ ...ROW, ticket_tokens: { t1: 'ExponentPushToken[a]' } }]);
    expect(callsOf(log, 'push_notifications')).toEqual(
      expect.arrayContaining([
        ['select', ['id, profile_id, ticket_ids, ticket_tokens, error, created_at']],
        ['gte', ['sent_at', '2026-10-01T12:00:00.000Z']],
        ['lte', ['sent_at', '2026-10-02T11:45:00.000Z']],
        ['filter', ['ticket_ids', 'neq', '{}']],
      ]),
    );
  });

  it('unchecked: a malformed ticket_tokens reads as no map, never throws', async () => {
    const { db } = chainDb({ push_notifications: [{ data: [{ ...ROW, ticket_tokens: [1, 2] }] }] });
    const range = { from: new Date('2026-10-01T12:00:00Z'), to: new Date('2026-10-02T11:45:00Z') };
    const rows = await new PushReceiptsRepo(db).unchecked(range);
    expect(rows).toEqual([{ ...ROW, ticket_tokens: {} }]);
  });

  it('prune deletes the dead bindings of that profile made before the row; profiles untouched', async () => {
    const { db, log } = chainDb({
      push_device_sessions: [{ data: [{ token: 'ExponentPushToken[old]' }] }],
    });
    const deleted = await new PushReceiptsRepo(db).prune(ROW, ['ExponentPushToken[old]']);
    expect(deleted).toEqual(['ExponentPushToken[old]']);
    expect(callsOf(log, 'push_device_sessions')).toEqual([
      ['delete', []],
      ['eq', ['profile_id', 'a1']],
      ['in', ['token', ['ExponentPushToken[old]']]],
      ['lte', ['created_at', '2026-10-02T11:00:00.000Z']],
      ['select', ['token']],
    ]);
    expect(callsOf(log, 'profiles')).toEqual([]);
  });

  it('prune: a binding already gone deletes nothing', async () => {
    const { db } = chainDb({ push_device_sessions: [{ data: [] }] });
    expect(await new PushReceiptsRepo(db).prune(ROW, ['ExponentPushToken[old]'])).toEqual([]);
  });

  it('settle keeps the pending tickets, their tokens and the error', async () => {
    const { db, log } = chainDb();
    const values = { ticket_ids: ['t2'], ticket_tokens: { t2: 'ExponentPushToken[b]' }, error: null };
    await new PushReceiptsRepo(db).settle('p1', values);
    expect(callsOf(log, 'push_notifications')).toEqual([
      ['update', [values]],
      ['eq', ['id', 'p1']],
    ]);
  });
});
