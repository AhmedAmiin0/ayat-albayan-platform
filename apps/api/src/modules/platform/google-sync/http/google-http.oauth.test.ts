import { afterEach, describe, expect, it, vi } from 'vitest';
import { googleEndpoints, type GoogleEnv } from '@/config/env/env.google';
import { GoogleOAuthApi } from './google-http.oauth';

// h2 (docs/36): the userinfo read through the core; any string email, else null; 15 s.
const env: GoogleEnv = {
  clientId: 'c',
  clientSecret: 's',
  redirectUri: 'https://app.invalid/cb',
  endpoints: googleEndpoints('https://google.invalid'),
};
const api = new GoogleOAuthApi(env);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const answer = (res: Response) => {
  const fetch = vi.fn().mockResolvedValue(res);
  vi.stubGlobal('fetch', fetch);
  return fetch;
};

describe('GoogleOAuthApi.email', () => {
  it('reads the email with the bearer token from the userinfo endpoint', async () => {
    const fetch = answer(Response.json({ email: 'owner@x.invalid', sub: '1' }));
    expect(await api.email('tok')).toBe('owner@x.invalid');
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(env.endpoints.userinfo);
    expect(init.headers).toEqual({ authorization: 'Bearer tok' });
  });

  it('any string is accepted, as before', async () => {
    answer(Response.json({ email: 'not an email' }));
    expect(await api.email('tok')).toBe('not an email');
  });

  it.each([
    ['a non-2xx', Response.json({ email: 'a@b.c' }, { status: 401 })],
    ['no email', Response.json({ sub: '1' })],
    ['a non-string email', Response.json({ email: 7 })],
    ['not JSON', new Response('<html>')],
  ])('%s → null', async (_name, res) => {
    answer(res);
    expect(await api.email('tok')).toBeNull();
  });

  it('a network failure still throws (the caller turns it into null)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(api.email('tok')).rejects.toThrow('google userinfo: network');
  });

  it('gives up after 15 s', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => undefined)));
    const call = api.email('tok').catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(await call).toMatchObject({ message: 'google userinfo: timeout' });
  });
});
