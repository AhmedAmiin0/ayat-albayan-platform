import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { ThreadMessagesRepo } from './thread-messages.repo';

// Rule 8 before a correction's checks (review of #694): the row a dedup_key already queued.

describe('ThreadMessagesRepo.byDedupKey', () => {
  it('reads the row by its key; none = null', async () => {
    const stored = { id: 'm1', body: 'تصحيح: الخامسة', dedup_key: 'k1' };
    const hit = fakeDb({ messages: [{ data: stored }] });
    await expect(new ThreadMessagesRepo(hit.db).byDedupKey('k1')).resolves.toEqual(stored);
    expect(hit.argsOf('messages', 'eq')).toEqual(['dedup_key', 'k1']);
    const miss = fakeDb({ messages: [{ data: null }] });
    await expect(new ThreadMessagesRepo(miss.db).byDedupKey('k2')).resolves.toBeNull();
  });

  it('a failed read names the step', async () => {
    const { db } = fakeDb({ messages: [{ error: { message: 'boom' } }] });
    await expect(new ThreadMessagesRepo(db).byDedupKey('k1')).rejects.toThrow('message dedup read failed: boom');
  });
});
