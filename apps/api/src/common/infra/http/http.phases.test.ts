import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createHttp } from './http';
import { answering, brokenBody, caught, profileOf, stalledBody } from './http.fakes';

const schema = z.unknown();
const never = (): Promise<Record<string, string>> => new Promise(() => undefined);

describe('before the request leaves', () => {
  afterEach(() => vi.useRealTimers());

  it('a headers() that fails is network, reached false, and nothing is sent', async () => {
    const fetch = answering(() => Response.json({}));
    const headers = () => Promise.reject(new Error('refresh failed'));
    const { failure } = await caught(
      createHttp(profileOf({ fetch, headers })).json({ path: 'm', schema }),
    );
    expect(failure).toEqual({ kind: 'network', reached: false, where: 'test GET /m' });
    expect(fetch.calls).toEqual([]);
  });

  it('a headers() that hangs still ends at the deadline', async () => {
    vi.useFakeTimers();
    const http = createHttp(
      profileOf({ fetch: answering(() => Response.json({})), headers: never }),
    );
    const call = caught(http.json({ path: 'm', schema, timeoutMs: 40 }));
    await vi.advanceTimersByTimeAsync(40);
    expect((await call).key).toBe('timeout');
  });

  it('a caller abort ends a headers() that hangs', async () => {
    const caller = new AbortController();
    const http = createHttp(
      profileOf({ fetch: answering(() => Response.json({})), headers: never }),
    );
    const call = http.json({ path: 'm', schema, signal: caller.signal });
    caller.abort('left');
    await expect(call).rejects.toBe('left');
  });

  it('an invalid URL rejects (never throws), names no path and sends nothing', async () => {
    const fetch = answering(() => Response.json({}));
    const call = createHttp(profileOf({ fetch })).json({
      path: 'http://[bad?token=SECRET',
      schema,
    });
    const { failure } = await caught(call);
    expect(failure).toEqual({ kind: 'network', reached: false, where: 'test GET <invalid path>' });
    expect(fetch.calls).toEqual([]);
  });
});

describe('after the response headers', () => {
  afterEach(() => vi.useRealTimers());

  it('a body that never ends is a timeout at the deadline', async () => {
    vi.useFakeTimers();
    const http = createHttp(profileOf({ fetch: answering(stalledBody), timeoutMs: 60 }));
    const call = caught(http.json({ path: 'm', schema }));
    await vi.advanceTimersByTimeAsync(60);
    expect((await call).failure).toMatchObject({ kind: 'timeout' });
  });

  it('bytes(): a broken stream is network, reached true', async () => {
    const http = createHttp(profileOf({ fetch: answering(brokenBody) }));
    const call = http.bytes({ path: 'f', maxBytes: 99, tooLarge: () => new Error('big') });
    expect((await caught(call)).failure).toMatchObject({ kind: 'network', reached: true });
  });
});

describe('the base', () => {
  it("'' is base() itself, with no trailing slash", async () => {
    const fetch = answering(() => Response.json({}));
    await createHttp(profileOf({ fetch, base: 'https://fx.invalid/v6/KEY/latest/USD' })).status({
      path: '',
    });
    expect(fetch.calls[0]?.[0]).toBe('https://fx.invalid/v6/KEY/latest/USD');
  });

  it('a keyed base never shows in a failure', async () => {
    const fetch = answering(() => new Response('x', { status: 500 }));
    const http = createHttp(profileOf({ fetch, base: 'https://fx.invalid/v6/SECRET-KEY/latest' }));
    const error = await caught(http.json({ path: 'USD', schema }));
    expect(JSON.stringify(error) + error.message).not.toContain('SECRET-KEY');
  });
});
