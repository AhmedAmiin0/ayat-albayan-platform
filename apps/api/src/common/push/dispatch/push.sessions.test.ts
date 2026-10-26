import { describe, expect, it, vi } from 'vitest';
import { fakePushDb, fakeWeb, flushPushes, okTickets, pushService } from '../push.fakes';
import type { PushTransport } from '../push.service';
import { liveSessions } from './push.sessions';

const T = 'ExponentPushToken[t]';
const target = {
  kind: 'new_student' as const,
  subject: 'lesson-1',
  vars: { student: 'سهيلة', when: 'الأحد' },
  profileIds: ['t1'],
};
const teacher = { id: 't1', role: 'teacher', push_tokens: [T] };

async function sentTokens(opts: Parameters<typeof fakePushDb>[1]) {
  const { db, writes } = fakePushDb([teacher], opts);
  const transport = vi.fn<PushTransport>(async (m) => okTickets(m.length));
  await pushService(db, { transport, web: fakeWeb().web }).notifyProfiles(target);
  await flushPushes();
  const rows = writes.filter((w) => w.op === 'upsert');
  return { rows, tokens: transport.mock.calls.flatMap(([m]) => m.map((x) => x.to)) };
}

describe('device pushes only to a live session of the recipient (migration 700)', () => {
  it('a token bound to a live session of that profile is pushed', async () => {
    expect((await sentTokens({})).tokens).toEqual([T]);
  });

  it('the session ended (sign-out not heard, revoked, expired): bell row kept, no device push', async () => {
    const { rows, tokens } = await sentTokens({ live: [] });
    expect(rows).toHaveLength(1);
    expect(tokens).toEqual([]);
  });

  it('a token never bound (registered before migration 700) is not pushed', async () => {
    expect((await sentTokens({ bindings: [] })).tokens).toEqual([]);
  });

  it('a token bound to ANOTHER profile (the device signed in as someone else) is not pushed to this one', async () => {
    const bindings = [{ token: T, profile_id: 'other', session_id: 'live' }];
    expect((await sentTokens({ bindings })).tokens).toEqual([]);
  });

  it('a contested binding (asked for without its device key, migration 720) is not pushed', async () => {
    const bindings = [{ token: T, profile_id: 't1', session_id: 'live', contested_at: '2026-10-25T00:00:00Z' }];
    expect((await sentTokens({ bindings })).tokens).toEqual([]);
  });
});

describe('a failed session lookup (migration not applied yet, RPC timeout)', () => {
  it('fails closed for devices, but the bell row is still written', async () => {
    const { db, writes, rpc } = fakePushDb([teacher]);
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'timeout' } } as never);
    const transport = vi.fn<PushTransport>(async (m) => okTickets(m.length));
    await pushService(db, { transport, web: fakeWeb().web }).notifyProfiles(target);
    await flushPushes();
    expect(writes.filter((w) => w.op === 'upsert')).toHaveLength(1);
    expect(transport).not.toHaveBeenCalled();
  });
});

describe('liveSessions', () => {
  it('asks push_live_sessions once for the distinct non-null ids; none asks nothing', async () => {
    const { db, rpc } = fakePushDb([], { live: ['a'] });
    expect([...(await liveSessions(db, ['a', 'a', null, 'b']))]).toEqual(['a']);
    expect(rpc).toHaveBeenCalledWith('push_live_sessions', { p_ids: ['a', 'b'] });
    rpc.mockClear();
    expect((await liveSessions(db, [null])).size).toBe(0);
    expect(rpc).not.toHaveBeenCalled();
  });
});
