import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { ThreadMessagesRepo } from './thread-messages.repo';

// A thread is ordered by each message's time, whatever its direction or how it got stored (owner
// report 2026-10-26): created_at, then id, so a late-stored message lands where it was sent.

const queriesOn = (db: ReturnType<typeof fakeDb>['db']) => new ThreadMessagesRepo(db);

describe('ThreadMessagesRepo.messages order', () => {
  it('created_at newest first, id breaking a tie, then the page limit + 1', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: [] }] });
    await queriesOn(db).messages({ phone: '+966501234567', limit: 50 });
    expect(calls.filter((c) => c.method === 'order').map((c) => c.args)).toEqual([
      ['created_at', { ascending: false }],
      ['id', { ascending: false }],
    ]);
    expect(calls.find((c) => c.method === 'limit')?.args).toEqual([51]);
  });

  it('an older page keeps the same order below the cursor', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: [] }] });
    await queriesOn(db).messages({ phone: '+966501234567', before: '2026-10-22T10:00:00.000Z', limit: 50 });
    expect(calls.find((c) => c.method === 'lt')?.args).toEqual(['created_at', '2026-10-22T10:00:00.000Z']);
    expect(calls.filter((c) => c.method === 'order')).toHaveLength(2);
  });
});
