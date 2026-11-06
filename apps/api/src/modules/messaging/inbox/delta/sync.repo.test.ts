import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { SYNC_START, SyncRepo } from './sync.repo';

const AT = '2026-11-06T10:00:00.123456+00:00';
const ID = 'c0000000-0000-4000-8000-0000000000a1';
const OWN = '+966500000009';
const PHONE = '+966500000001';

describe('SyncRepo (GET /threads/sync keyset read)', () => {
  it('after (updated_at, id): >= at AND (> at OR id >), oldest first, limit + 1', async () => {
    const f = fakeDb({ messages: [{ data: [] }] });
    await new SyncRepo(f.db).page({ after: { at: AT, id: ID }, limit: 50, phones: null, hide: [] });
    expect(f.argsOf('messages', 'gte')).toEqual(['updated_at', AT]);
    expect(f.argsOf('messages', 'or')).toEqual([`updated_at.gt."${AT}",id.gt.${ID}`]);
    const orders = f.calls.filter((c) => c.method === 'order').map((c) => c.args);
    expect(orders).toEqual([
      ['updated_at', { ascending: true }],
      ['id', { ascending: true }],
    ]);
    expect(f.argsOf('messages', 'limit')).toEqual([51]);
    expect(f.calls.some((c) => c.method === 'in' || c.method === 'not')).toBe(false);
  });

  it('own numbers never read; a teacher only her phones', async () => {
    const f = fakeDb({ messages: [{ data: [] }] });
    await new SyncRepo(f.db).page({ after: SYNC_START, limit: 10, phones: [PHONE], hide: [OWN] });
    expect(f.argsOf('messages', 'not')).toEqual(['phone_e164', 'in', `("${OWN}")`]);
    expect(f.argsOf('messages', 'in')).toEqual(['phone_e164', [PHONE]]);
  });

  it('tombstones: the same keyset on deleted_at, the same scope', async () => {
    const f = fakeDb({ message_tombstones: [{ data: [] }] });
    await new SyncRepo(f.db).tombstones({
      after: { at: AT, id: ID },
      limit: 5,
      phones: [PHONE],
      hide: [OWN],
    });
    expect(f.argsOf('message_tombstones', 'gte')).toEqual(['deleted_at', AT]);
    expect(f.argsOf('message_tombstones', 'or')).toEqual([`deleted_at.gt."${AT}",id.gt.${ID}`]);
    expect(f.argsOf('message_tombstones', 'in')).toEqual(['phone_e164', [PHONE]]);
    expect(f.argsOf('message_tombstones', 'not')).toEqual(['phone_e164', 'in', `("${OWN}")`]);
    expect(f.argsOf('message_tombstones', 'limit')).toEqual([6]);
  });

  it('a failed read throws', async () => {
    const f = fakeDb({ messages: [{ error: { message: 'boom' } }] });
    const page = new SyncRepo(f.db).page({ after: SYNC_START, limit: 1, phones: null, hide: [] });
    await expect(page).rejects.toThrow('thread sync read failed: boom');
  });
});
