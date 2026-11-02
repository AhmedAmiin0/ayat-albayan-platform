import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { GraphEnv } from '@/config/env/env';
import { KAPSO_ENV, kapsoFetch } from '@/modules/messaging/whatsapp/drivers/kapso/kapso.fakes';
import { STUB_ENV } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { graphDownload, graphHttp, type FetchLike } from './graph';

// docs/36 h8: graph.ts's error table, one test per key, replaying what graphFetch/graphJson did.

const conn = (fetch: FetchLike, env: GraphEnv = STUB_ENV) => ({ env, fetch, timeoutMs: 1_000 });
const ANY = z.unknown();

async function failure(fetch: FetchLike, env: GraphEnv = STUB_ENV): Promise<WaError> {
  const e = await graphHttp(conn(fetch, env))
    .json({ path: 'x', schema: ANY })
    .catch((x: unknown) => x);
  if (!(e instanceof WaError)) throw new Error('expected a WaError');
  return e;
}

const reply = (status: number, body: unknown) => kapsoFetch({ status, body }).fetch;
const errno = (code: string) => Object.assign(new TypeError('fetch failed'), { cause: { code } });

describe('graph.ts error table', () => {
  it('default: Meta\'s error body → its message, code and details', async () => {
    const body = { error: { message: 'bad param', code: 100, error_data: { details: 'why' } } };
    const e = await failure(reply(400, body));
    expect(e.message).toBe('bad param');
    expect(e.info).toEqual({ code: 100, status: 400, details: 'why' });
    const user = await failure(reply(400, { error: { code: 131047, error_user_msg: 'late' } }));
    expect(user.message).toBe('WhatsApp HTTP 400');
    expect(user.info).toEqual({ code: 131047, status: 400, details: 'late' });
  });

  it('default: any other body → «WhatsApp HTTP n», code null, its text (300 chars) as details', async () => {
    const plain = async () => new Response('x'.repeat(400), { status: 502 });
    const e = await failure(plain);
    expect(e.message).toBe('WhatsApp HTTP 502');
    expect(e.info).toEqual({ code: null, status: 502, details: 'x'.repeat(300) });
    const empty = await failure(async () => new Response('', { status: 500 }));
    expect(empty.info).toEqual({ code: null, status: 500, details: undefined });
  });

  it('network: uncertain unless the connection was never made', async () => {
    const lost = await failure(() => Promise.reject(errno('ECONNRESET')));
    expect(lost.info).toEqual({ code: null, status: 0, uncertain: true });
    const refused = await failure(() => Promise.reject(errno('ECONNREFUSED')));
    expect(refused.info).toEqual({ code: null, status: 0, uncertain: false });
    expect(refused.message).toBe('WhatsApp request failed');
  });

  it('timeout: status 0, uncertain', async () => {
    const hang: FetchLike = (_url, init) =>
      new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(new Error('x'))));
    const e = await graphHttp({ env: STUB_ENV, fetch: hang, timeoutMs: 5 })
      .json({ path: 'x', schema: ANY })
      .catch((x: unknown) => x);
    expect(e).toBeInstanceOf(WaError);
    expect((e as WaError).info).toEqual({ code: null, status: 0, uncertain: true });
  });

  it('shape: «Unexpected WhatsApp response», status 200, the zod issues as details', async () => {
    const schema = z.object({ id: z.string() });
    const e = await graphHttp(conn(reply(200, { id: 1 })))
      .json({ path: 'x', schema })
      .catch((x: unknown) => x);
    expect((e as WaError).message).toBe('Unexpected WhatsApp response');
    expect((e as WaError).info).toMatchObject({ code: null, status: 200 });
    expect((e as WaError).info.details).toContain('"id"');
    const notJson = graphHttp(conn(async () => new Response('<html>', { status: 200 })));
    await expect(notJson.json({ path: 'x', schema })).rejects.toThrow('Unexpected WhatsApp');
  });

  it('401 / 403: tagged kapso on a keyed Kapso line only (byDriver); Meta lines pass through', async () => {
    for (const status of [401, 403]) {
      const kapso = await failure(reply(status, { error: 'Unauthorized' }), KAPSO_ENV);
      expect(kapso.info).toMatchObject({ credential: 'kapso', code: null, status });
      const meta = await failure(reply(status, { error: 'Unauthorized' }));
      expect(meta.info.credential).toBeUndefined();
    }
    const metaCode = await failure(reply(401, { error: { code: 190, message: 't' } }), KAPSO_ENV);
    expect(metaCode.info).toEqual({ code: 190, status: 401, details: undefined });
  });

  it('the download profile: no credential, and its 401 is never tagged', async () => {
    const f = kapsoFetch({ status: 401, body: { error: 'expired' } });
    const e = await graphDownload(conn(f.fetch, KAPSO_ENV))
      .json({ path: 'https://files.example.test/m?token=t', schema: ANY })
      .catch((x: unknown) => x);
    expect((e as WaError).info).toEqual({ code: null, status: 401, details: '{"error":"expired"}' });
    expect(f.requests[0]?.headers).toEqual({});
  });

  it('no URL, query or credential in a failure\'s message or details', async () => {
    const e = await graphHttp(conn(() => Promise.reject(errno('ECONNRESET')), KAPSO_ENV))
      .json({ path: 'https://files.example.test/m?token=secret-t', schema: ANY })
      .catch((x: unknown) => x);
    expect(JSON.stringify(e) + String(e)).not.toMatch(/secret-t|fake-kapso-key|files\.example/);
  });
});
