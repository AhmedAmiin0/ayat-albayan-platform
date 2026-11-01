import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { FetchLike } from './failure';
import { createHttp } from './http';
import { caught, hanging, profileOf } from './http.fakes';

const schema = z.unknown();

/** Answers only when its signal aborts (a fetch that honours the signal). */
const honouring: FetchLike = (_url, init) =>
  new Promise<Response>((_, reject) => {
    init.signal?.addEventListener('abort', () => {
      reject(new DOMException('aborted', 'AbortError'));
    });
  });

describe('the deadline', () => {
  afterEach(() => vi.useRealTimers());

  it('a transport that ignores its signal still ends at the deadline', async () => {
    vi.useFakeTimers();
    const http = createHttp(profileOf({ fetch: hanging, timeoutMs: 5_000 }));
    const call = caught(http.json({ path: 'm', schema }));
    await vi.advanceTimersByTimeAsync(4_999);
    let settled = false;
    void call.then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await call).toMatchObject({ key: 'timeout', failure: { kind: 'timeout' } });
  });

  it('aborts the signal it handed the transport', async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    const spy: FetchLike = (url, init) => {
      if (init.signal) signals.push(init.signal);
      return honouring(url, init);
    };
    const call = createHttp(profileOf({ fetch: spy, timeoutMs: 100 })).json({ path: 'm', schema });
    const result = caught(call);
    await vi.advanceTimersByTimeAsync(100);
    expect((await result).key).toBe('timeout');
    expect(signals[0]?.aborted).toBe(true);
  });

  it('the call timeout overrides the profile', async () => {
    vi.useFakeTimers();
    const http = createHttp(profileOf({ fetch: hanging, timeoutMs: 5_000 }));
    const call = caught(http.json({ path: 'm', schema, timeoutMs: 50 }));
    await vi.advanceTimersByTimeAsync(50);
    expect((await call).key).toBe('timeout');
  });

  it("a caller's abort is rethrown as its reason, never through the table", async () => {
    const caller = new AbortController();
    const reason = new Error('the user left');
    const call = createHttp(profileOf({ fetch: honouring })).json({
      path: 'm',
      schema,
      signal: caller.signal,
    });
    caller.abort(reason);
    await expect(call).rejects.toBe(reason);
  });

  it('the caller abort also ends a transport that ignores its signal', async () => {
    const caller = new AbortController();
    const call = createHttp(profileOf({ fetch: hanging })).json({
      path: 'm',
      schema,
      signal: caller.signal,
    });
    caller.abort('gone');
    await expect(call).rejects.toBe('gone');
  });

  it('an already aborted caller signal never calls the transport', async () => {
    const calls: string[] = [];
    const spy: FetchLike = (url) => {
      calls.push(url);
      return Promise.resolve(Response.json({}));
    };
    const signal = AbortSignal.abort('early');
    await expect(
      createHttp(profileOf({ fetch: spy })).json({ path: 'm', schema, signal }),
    ).rejects.toBe('early');
    expect(calls).toEqual([]);
  });

  it('with a caller signal, the deadline still fires as a timeout', async () => {
    vi.useFakeTimers();
    const caller = new AbortController();
    const http = createHttp(profileOf({ fetch: honouring, timeoutMs: 30 }));
    const call = caught(http.json({ path: 'm', schema, signal: caller.signal }));
    await vi.advanceTimersByTimeAsync(30);
    expect((await call).key).toBe('timeout');
    caller.abort();
  });
});
