import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { deviceKeyHash, mintDeviceKey } from '../../common/push/push-claim';
import { fakeDb, type FakeResult } from '../guardians/fake-db';
import { MeService } from './me.service';

// Review of #172 (PR #175) and #177: an admin who knows a teacher's token must not pull the
// teacher's phone onto the admin's alerts. The rule itself runs in claim_push_device (migration 730,
// e2e/tests/push-device-claim.sql.spec.ts); here: what the API sends it and makes of its answer.
const T = 'ExponentPushToken[tttttttttttttttttttttt]';
const KEY = mintDeviceKey();

function setup(answer: FakeResult) {
  return fakeDb({ 'rpc:claim_push_device': [answer], profiles: [{ data: { push_tokens: [] } }, {}, { data: [] }] });
}
const add = (db: ReturnType<typeof setup>['db'], deviceKey?: string) =>
  new MeService(db).addPushToken({ userId: 'admin-1', token: T, sessionId: 'sess-a', deviceKey });

describe('PUT /me/push-tokens: no takeover of another person’s live device', () => {
  it('sends the token, the caller, its session, a fresh key’s hash and the presented key’s hash only', async () => {
    const { db, argsOf } = setup({ data: 'bound' });
    await add(db, KEY);
    expect(argsOf('rpc:claim_push_device', 'rpc')).toEqual([
      { p_token: T, p_profile: 'admin-1', p_session: 'sess-a', p_new_hash: expect.stringMatching(/^[0-9a-f]{64}$/), p_presented: deviceKeyHash(KEY) },
    ]);
    expect(JSON.stringify(argsOf('rpc:claim_push_device', 'rpc'))).not.toContain(KEY);
  });

  it('in_use (another person’s live device, no key proved it) → 409, profiles untouched', async () => {
    const { db, calls } = setup({ data: 'in_use' });
    await expect(add(db)).rejects.toBeInstanceOf(ConflictException);
    expect(calls.some((c) => c.table === 'profiles')).toBe(false);
  });

  it('proven (the same phone, signed in as someone else) → the presented key kept', async () => {
    await expect(add(setup({ data: 'proven' }).db, KEY)).resolves.toEqual({ deviceKey: KEY });
  });

  it('bound → a fresh key, the one whose hash was sent', async () => {
    const { db, argsOf } = setup({ data: 'bound' });
    const { deviceKey } = await add(db, KEY);
    expect(deviceKey).not.toBe(KEY);
    expect(argsOf('rpc:claim_push_device', 'rpc')?.[0]).toMatchObject({ p_new_hash: deviceKeyHash(deviceKey) });
  });

  it('no_session → 401; a failed call or an unknown answer fails, nothing on profiles', async () => {
    await expect(add(setup({ data: 'no_session' }).db)).rejects.toBeInstanceOf(UnauthorizedException);
    for (const answer of [{ error: { message: 'down' } }, { data: 'what' }]) {
      const { db, calls } = setup(answer);
      await expect(add(db)).rejects.toThrow();
      expect(calls.some((c) => c.table === 'profiles')).toBe(false);
    }
  });
});
