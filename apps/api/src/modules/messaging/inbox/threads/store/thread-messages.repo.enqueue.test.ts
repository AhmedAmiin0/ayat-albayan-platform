import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { ThreadMessagesRepo } from './thread-messages.repo';

// Rule 8: a replayed dedup_key returns the first row, flagged `replayed`; no key = a plain insert.

const ROW = { phone_e164: '+966501234567', direction: 'outbound' as const, body: 'سلام' };
const STORED = { id: 'm1', ...ROW };
const repoOn = (db: ReturnType<typeof fakeDb>['db']) => new ThreadMessagesRepo(db);

describe('ThreadMessagesRepo.enqueue', () => {
  it('no dedup_key: one insert, the stored row, no replayed flag', async () => {
    const { db, calls, trips } = fakeDb({ messages: [{ data: STORED }] });
    await expect(repoOn(db).enqueue(ROW)).resolves.toEqual(STORED);
    expect(trips).toEqual(['messages']);
    expect(calls.some((c) => c.method === 'upsert')).toBe(false);
  });

  it('a new dedup_key: the upsert writes, the read-back is not replayed', async () => {
    const row = { ...ROW, dedup_key: 'k1' };
    const { db, argsOf } = fakeDb({ messages: [{ data: [{ id: 'm1' }] }, { data: { ...STORED, dedup_key: 'k1' } }] });
    await expect(repoOn(db).enqueue(row)).resolves.toMatchObject({ id: 'm1', replayed: false });
    expect(argsOf('messages', 'upsert')).toEqual([row, { onConflict: 'dedup_key', ignoreDuplicates: true }]);
    expect(argsOf('messages', 'eq')).toEqual(['dedup_key', 'k1']);
  });

  it('a replayed dedup_key: nothing written, the first row comes back replayed', async () => {
    const { db } = fakeDb({ messages: [{ data: [] }, { data: { ...STORED, dedup_key: 'k1' } }] });
    await expect(repoOn(db).enqueue({ ...ROW, dedup_key: 'k1' })).resolves.toMatchObject({ id: 'm1', replayed: true });
  });

  it('a failed write names the step', async () => {
    const { db } = fakeDb({ messages: [{ error: { message: 'boom' } }] });
    await expect(repoOn(db).enqueue(ROW)).rejects.toThrow('message enqueue failed: boom');
  });
});
