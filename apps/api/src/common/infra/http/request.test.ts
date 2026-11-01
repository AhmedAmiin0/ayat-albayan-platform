import { describe, expect, it } from 'vitest';
import { createHttp } from './http';
import { answering, profileOf } from './http.fakes';
import { urlOf, whereOf } from './request';

describe('urlOf', () => {
  it('joins base and path, adds the query without undefined values', () => {
    const url = urlOf('https://h.invalid/v21', {
      path: '123/messages',
      query: { a: 1, b: undefined, c: 'x y' },
    });
    expect(url).toBe('https://h.invalid/v21/123/messages?a=1&c=x+y');
  });

  it('keeps an absolute path as is', () => {
    expect(urlOf('https://h.invalid', { path: 'https://cdn.invalid/f?token=t' })).toBe(
      'https://cdn.invalid/f?token=t',
    );
  });
});

describe('whereOf', () => {
  it('names the profile, the method and the path only', () => {
    expect(whereOf('kapso', { path: 'https://cdn.invalid/a/b?token=t', method: 'POST' })).toBe(
      'kapso POST /a/b',
    );
    expect(whereOf('meta', { path: '1/messages?x=1' })).toBe('meta GET /1/messages');
  });
});

describe('the request', () => {
  it('sends the profile headers, the JSON body and the profile redirect', async () => {
    const fetch = answering(() => Response.json({}));
    const http = createHttp(profileOf({ fetch }));
    await http.status({ path: 'm', method: 'POST', json: { a: 1 }, headers: { 'x-extra': '1' } });
    const [url, init] = fetch.calls[0] ?? ['', {}];
    expect(url).toBe('https://peer.invalid/v1/m');
    expect(init).toMatchObject({ method: 'POST', body: '{"a":1}', redirect: 'error' });
    expect(init.headers).toEqual({
      'x-api-key': 'profile-key',
      'content-type': 'application/json',
      'x-extra': '1',
    });
  });

  it('a raw body is sent as is, with no JSON content type', async () => {
    const fetch = answering(() => new Response(''));
    const raw = new Uint8Array([1]);
    await createHttp(profileOf({ fetch })).status({ path: 'u', method: 'POST', raw });
    const init = fetch.calls[0]?.[1];
    expect(init?.body).toBe(raw);
    expect(init?.headers).toEqual({ 'x-api-key': 'profile-key' });
  });
});
