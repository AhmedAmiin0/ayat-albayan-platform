import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { fakeDb, type FakeResult } from '../../../modules/people/guardians/fake-db';
import { assertBrowserClaim } from './web-push.claim';

// Review of #172 (PR #175): another person's live browser never moves on its endpoint alone.
const P256 = 'B'.repeat(87);
const AUTH = 'a'.repeat(22);
const sub = (keys = { p256dh: P256, auth: AUTH }) => ({ endpoint: 'https://fcm.googleapis.com/x', keys });
const row = (over: object = {}): FakeResult => ({
  data: { profile_id: 'teacher-1', session_id: 'sess-t', p256dh: P256, auth: AUTH, ...over },
});
const claim = (binding: FakeResult, live: string[], keys?: { p256dh: string; auth: string }) => {
  const { db, calls } = fakeDb({ web_push_subscriptions: [binding], 'rpc:push_live_sessions': [{ data: live }] });
  return { calls, run: assertBrowserClaim(db, { profileId: 'admin-1', sub: sub(keys) }) };
};

describe('assertBrowserClaim (PUT /me/web-push)', () => {
  it('attack: another person’s live browser with other keys → 409', async () => {
    const { run } = claim(row(), ['sess-t'], { p256dh: 'C'.repeat(87), auth: 'b'.repeat(22) });
    await expect(run).rejects.toBeInstanceOf(ConflictException);
  });

  it('legit: the same browser (its own keys) signed in as someone else → allowed, no session lookup', async () => {
    const { run, calls } = claim(row(), ['sess-t']);
    await expect(run).resolves.toBeUndefined();
    expect(calls.some((c) => c.table === 'rpc:push_live_sessions')).toBe(false);
  });

  it('a new endpoint, the caller’s own, an ended session or a row before migration 700 → allowed', async () => {
    const other = { p256dh: 'C'.repeat(87), auth: 'b'.repeat(22) };
    await expect(claim({ data: null }, [], other).run).resolves.toBeUndefined();
    await expect(claim(row({ profile_id: 'admin-1' }), ['sess-t'], other).run).resolves.toBeUndefined();
    await expect(claim(row(), [], other).run).resolves.toBeUndefined();
    await expect(claim(row({ session_id: null }), [], other).run).resolves.toBeUndefined();
  });
});
