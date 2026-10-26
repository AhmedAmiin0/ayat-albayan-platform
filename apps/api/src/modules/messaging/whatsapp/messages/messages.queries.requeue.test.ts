import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../../people/guardians/fake-db';
import { MessagesQueries } from './messages.queries';

// The admin's retry never re-sends a message that was never ours to send: one sent outside the app
// (Kapso's inbox, WhatsApp Business app) or imported history: created_by null, attempts 0, a wamid.

describe('MessagesQueries.requeue', () => {
  it('only a failed row we tried (attempts > 0), never sent (no wamid) or created by a person', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: null }] });
    expect(await new MessagesQueries(db).requeue('m1')).toBeNull();
    expect(calls.find((c) => c.method === 'or')?.args).toEqual(['attempts.gt.0,wa_message_id.is.null,created_by.not.is.null']);
    expect(calls.filter((c) => c.method === 'eq').map((c) => c.args)).toEqual([['id', 'm1'], ['status', 'failed']]);
  });
});
