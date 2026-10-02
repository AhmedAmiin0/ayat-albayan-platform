import { describe, expect, it } from 'vitest';
import { callsOf, chainDb } from '../reminders/chain-db.fake';
import { PushReceiptsQueries } from './push-receipts.queries';

describe('PushReceiptsQueries', () => {
  it('unchecked: sent in the window with tickets left', async () => {
    const { db, log } = chainDb();
    await new PushReceiptsQueries(db).unchecked({ from: new Date('2026-10-01T12:00:00Z'), to: new Date('2026-10-02T11:45:00Z') });
    expect(callsOf(log, 'push_notifications')).toEqual(
      expect.arrayContaining([
        ['gte', ['sent_at', '2026-10-01T12:00:00.000Z']],
        ['lte', ['sent_at', '2026-10-02T11:45:00.000Z']],
        ['filter', ['ticket_ids', 'neq', '{}']],
      ]),
    );
  });

  it('prune drops DeviceNotRegistered tokens from the profile', async () => {
    const tokens = ['ExponentPushToken[old]', 'ExponentPushToken[new]'];
    const { db, log } = chainDb({ profiles: [{ data: { push_tokens: tokens } }, {}] });
    expect(await new PushReceiptsQueries(db).prune('a1', ['ExponentPushToken[old]'])).toBe(1);
    expect(callsOf(log, 'profiles', 1)).toEqual([
      ['update', [{ push_tokens: ['ExponentPushToken[new]'] }]],
      ['eq', ['id', 'a1']],
    ]);
  });

  it('prune writes nothing when the token is already gone or the profile is missing', async () => {
    const gone = chainDb({ profiles: [{ data: { push_tokens: ['ExponentPushToken[new]'] } }] });
    expect(await new PushReceiptsQueries(gone.db).prune('a1', ['ExponentPushToken[old]'])).toBe(0);
    expect(gone.log).toHaveLength(1);
    const missing = chainDb({ profiles: [{ data: null }] });
    expect(await new PushReceiptsQueries(missing.db).prune('a1', ['ExponentPushToken[old]'])).toBe(0);
  });

  it('settle keeps the pending tickets and the error', async () => {
    const { db, log } = chainDb();
    await new PushReceiptsQueries(db).settle('p1', { ticket_ids: ['t2'], error: null });
    expect(callsOf(log, 'push_notifications')).toEqual([
      ['update', [{ ticket_ids: ['t2'], error: null }]],
      ['eq', ['id', 'p1']],
    ]);
  });
});
