import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../../people/guardians/fake-db';
import { dueMessage } from './sender.fakes';
import { SenderQueries } from './sender.queries';

// The calls number never sends a regular message (docs/28 §10): the queue never reads one of its
// rows.

const NOW = new Date('2026-10-27T08:00:00Z');

describe('SenderQueries.due and the calls number', () => {
  it('filters line calls in the query and drops any such row that still comes back', async () => {
    const calls = { ...dueMessage({ id: 'm-calls' }), line: 'calls' } as unknown as ReturnType<
      typeof dueMessage
    >;
    const { db, calls: recorded } = fakeDb({ messages: [{ data: [calls, dueMessage()] }] });
    const due = await new SenderQueries(db).due({ keys: [], now: NOW, limit: 50 });
    expect(due.map((r) => r.id)).toEqual([dueMessage().id]);
    expect(recorded.filter((c) => c.method === 'or').map((c) => c.args[0])).toContain(
      'line.is.null,line.neq.calls',
    );
  });
});
