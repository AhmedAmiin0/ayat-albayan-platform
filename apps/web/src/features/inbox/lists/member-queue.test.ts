import { describe, expect, it, vi } from 'vitest';
import { enqueueMember, memberQueueSnapshot, overlayIntents, type MemberIntent } from './member-queue';

const PHONE = '+966501234567';

/** A fake server whose answers resolve only when the test says so, in any order. */
function server() {
  const calls: { intent: MemberIntent; ok: () => Promise<unknown>; fail: () => Promise<unknown> }[] = [];
  const flush = () => new Promise((r) => setTimeout(r, 0));
  const send = vi.fn(
    (intent: MemberIntent) =>
      new Promise<void>((resolve, reject) => {
        calls.push({ intent, ok: () => (resolve(), flush()), fail: () => (reject(new Error('500')), flush()) });
      }),
  );
  const deps = { send, settle: vi.fn(async () => undefined), onFail: vi.fn() };
  return { calls, deps, flush };
}

describe('member-queue: one save per (list, chat), the last intent wins', () => {
  it('on → off of the same box: DELETE waits for PUT, so the server ends «off»', async () => {
    const { calls, deps, flush } = server();
    enqueueMember({ id: 'a', phone: PHONE, member: true }, deps);
    enqueueMember({ id: 'a', phone: PHONE, member: false }, deps);
    await flush();
    expect(calls.map((c) => c.intent.member)).toEqual([true]);
    expect(overlayIntents([], PHONE, memberQueueSnapshot()).has('a')).toBe(false);
    await calls[0]?.ok();
    expect(calls.map((c) => c.intent.member)).toEqual([true, false]);
    await calls[1]?.ok();
    expect(deps.settle).toHaveBeenCalledTimes(1);
    expect(memberQueueSnapshot().size).toBe(0);
  });

  it('on → off → on while PUT is in flight: nothing more to send', async () => {
    const { calls, deps } = server();
    for (const on of [true, false, true]) enqueueMember({ id: 'a', phone: PHONE, member: on }, deps);
    await calls[0]?.ok();
    expect(deps.send).toHaveBeenCalledTimes(1);
    expect(memberQueueSnapshot().size).toBe(0);
  });

  it('different boxes stay independent (sent in parallel)', async () => {
    const { calls, deps, flush } = server();
    enqueueMember({ id: 'a', phone: PHONE, member: true }, deps);
    enqueueMember({ id: 'b', phone: PHONE, member: false }, deps);
    await flush();
    expect(calls.map((c) => [c.intent.id, c.intent.member])).toEqual([
      ['a', true],
      ['b', false],
    ]);
    await calls[1]?.ok();
    await calls[0]?.ok();
    expect(memberQueueSnapshot().size).toBe(0);
  });

  it('a failed final save reports it and lets the box follow the server', async () => {
    const { calls, deps } = server();
    enqueueMember({ id: 'a', phone: PHONE, member: true }, deps);
    await calls[0]?.fail();
    expect(deps.onFail).toHaveBeenCalledTimes(1);
    expect(memberQueueSnapshot().size).toBe(0);
  });

  it('a failed save superseded by a newer choice still sends that choice', async () => {
    const { calls, deps } = server();
    enqueueMember({ id: 'a', phone: PHONE, member: true }, deps);
    enqueueMember({ id: 'a', phone: PHONE, member: false }, deps);
    await calls[0]?.fail();
    expect(calls[1]?.intent.member).toBe(false);
    await calls[1]?.ok();
    expect(deps.onFail).not.toHaveBeenCalled();
  });

  it('overlay: only this chat\'s in-flight boxes override the cache', () => {
    const intents = new Map([
      [`${PHONE} a`, false],
      [`${PHONE} b`, true],
      ['+966500000000 c', true],
    ]);
    expect([...overlayIntents(['a', 'x'], PHONE, intents)].sort()).toEqual(['b', 'x']);
  });
});
