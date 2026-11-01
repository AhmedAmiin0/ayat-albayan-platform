import { describe, expect, it } from 'vitest';
import { createHttp } from './http';
import { answering, errno, failing, profileOf, streaming, type TestError } from './http.fakes';

class TooLarge extends Error {}
const tooLarge = (): Error => new TooLarge('invoice_too_large');

describe('http.bytes', () => {
  it('the body and its content type', async () => {
    const res = () =>
      new Response(new Uint8Array([7, 8]), { headers: { 'content-type': 'image/png' } });
    const got = await createHttp(profileOf({ fetch: answering(res) })).bytes({
      path: 'f',
      maxBytes: 10,
      tooLarge,
    });
    expect([Array.from(got.bytes), got.mime]).toEqual([[7, 8], 'image/png']);
  });

  it('maxBytes while streaming: the caller error, as is', async () => {
    const http = createHttp(profileOf({ fetch: answering(() => streaming(1_000, 1_024)) }));
    await expect(http.bytes({ path: 'f', maxBytes: 4_096, tooLarge })).rejects.toBeInstanceOf(
      TooLarge,
    );
  });

  it('a declared content-length over the cap stops before reading', async () => {
    const res = () => new Response('12345', { headers: { 'content-length': '5' } });
    const http = createHttp(profileOf({ fetch: answering(res) }));
    await expect(http.bytes({ path: 'f', maxBytes: 4, tooLarge })).rejects.toBeInstanceOf(TooLarge);
  });

  it('a non-2xx goes to the table', async () => {
    const http = createHttp(
      profileOf({ fetch: answering(() => new Response('', { status: 404 })) }),
    );
    const e = (await http
      .bytes({ path: 'f', maxBytes: 4, tooLarge })
      .catch((x: unknown) => x)) as TestError;
    expect(e.key).toBe('404');
  });
});

describe('http.status', () => {
  it('answers any status, never the table', async () => {
    const statuses = [200, 404, 410, 503];
    const got = await Promise.all(
      statuses.map((status) =>
        createHttp(profileOf({ fetch: answering(() => new Response('x', { status })) })).status({
          path: 'k',
        }),
      ),
    );
    expect(got).toEqual(statuses);
  });

  it('a transport failure still goes to the table', async () => {
    const http = createHttp(profileOf({ fetch: failing(errno('ENOTFOUND')) }));
    const e = (await http.status({ path: 'k' }).catch((x: unknown) => x)) as TestError;
    expect(e.failure).toMatchObject({ kind: 'network', reached: false });
  });
});
