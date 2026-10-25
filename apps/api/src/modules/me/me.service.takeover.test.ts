import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { deviceKeyHash, mintDeviceKey } from '../../common/push/push-claim';
import { fakeDb, type FakeResult } from '../guardians/fake-db';
import { MeService } from './me.service';

// Review of #172 (PR #175 «Not fixed»): an admin who can read a teacher's token must not pull the
// teacher's phone onto the admin's alerts. Owner 2026-10-25: notifications only to authorized people.
const T = 'ExponentPushToken[tttttttttttttttttttttt]';
const KEY = mintDeviceKey();
const held = (hash: string | null): FakeResult => ({ data: { profile_id: 'teacher-1', session_id: 'sess-t', device_key_hash: hash } });

function setup(binding: FakeResult, live: string[]) {
  return fakeDb({
    push_device_sessions: [binding, {}],
    'rpc:push_live_sessions': [{ data: live }],
    profiles: [{ data: { push_tokens: [] } }, {}, { data: [] }],
  });
}
const upserts = (calls: { table: string; method: string }[]) =>
  calls.filter((c) => c.table === 'push_device_sessions' && c.method === 'upsert');

describe('PUT /me/push-tokens: no takeover of another person’s live device', () => {
  it('attack: the token alone (no key, or a wrong one) → 409, the binding and profiles untouched', async () => {
    for (const deviceKey of [undefined, mintDeviceKey()]) {
      const { db, calls } = setup(held(deviceKeyHash(KEY)), ['sess-t']);
      const add = new MeService(db).addPushToken({ userId: 'admin-1', token: T, sessionId: 'sess-a', deviceKey });
      await expect(add).rejects.toBeInstanceOf(ConflictException);
      expect(upserts(calls)).toEqual([]);
      expect(calls.some((c) => c.table === 'profiles')).toBe(false);
    }
  });

  it('attack: a binding made before migration 720 (no key) is just as safe while its session lives', async () => {
    const { db } = setup(held(null), ['sess-t']);
    const add = new MeService(db).addPushToken({ userId: 'admin-1', token: T, sessionId: 'sess-a', deviceKey: KEY });
    await expect(add).rejects.toBeInstanceOf(ConflictException);
  });

  it('legit: the teacher signs in on the admin’s old phone (its key) → moved, the same key kept', async () => {
    const { db, calls } = setup(held(deviceKeyHash(KEY)), ['sess-t']);
    const res = await new MeService(db).addPushToken({ userId: 'admin-1', token: T, sessionId: 'sess-a', deviceKey: KEY });
    expect(res).toEqual({ deviceKey: KEY });
    expect(upserts(calls)[0]?.args[0]).toMatchObject({ profile_id: 'admin-1', session_id: 'sess-a', device_key_hash: deviceKeyHash(KEY) });
    expect(calls.some((c) => c.table === 'rpc:push_live_sessions')).toBe(false);
  });

  it('legit: the old holder’s session has ended → moved with a fresh key', async () => {
    const { db, calls } = setup(held(deviceKeyHash(KEY)), []);
    const res = await new MeService(db).addPushToken({ userId: 'admin-1', token: T, sessionId: 'sess-a' });
    expect(res.deviceKey).not.toBe(KEY);
    expect(upserts(calls)[0]?.args[0]).toMatchObject({ profile_id: 'admin-1', device_key_hash: deviceKeyHash(res.deviceKey) });
  });

  it('the holder re-registering its own device always passes (a new key when it lost the old one)', async () => {
    const { db } = setup({ data: { profile_id: 'admin-1', session_id: 'old', device_key_hash: null } }, []);
    const res = await new MeService(db).addPushToken({ userId: 'admin-1', token: T, sessionId: 'sess-a' });
    expect(res.deviceKey).toMatch(/^[\w-]{43}$/);
  });

  it('a failed session lookup refuses nothing silently: the PUT fails, nothing is bound', async () => {
    const { db, calls } = fakeDb({
      push_device_sessions: [held(null)],
      'rpc:push_live_sessions': [{ error: { message: 'down' } }],
    });
    await expect(new MeService(db).addPushToken({ userId: 'admin-1', token: T, sessionId: 'sess-a' })).rejects.toThrow(/down/);
    expect(upserts(calls)).toEqual([]);
  });
});
