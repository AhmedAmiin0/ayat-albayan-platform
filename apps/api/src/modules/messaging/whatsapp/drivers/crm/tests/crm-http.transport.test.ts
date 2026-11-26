import { describe, expect, it } from 'vitest';
import { crmJson } from '@/modules/messaging/whatsapp/drivers/crm/crm-http';
import { CRM_ENV } from '@/modules/messaging/whatsapp/drivers/crm/crm.fakes';
import { scriptedFetch } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import type { FetchLike } from '@/common/infra/http/failure';

// crmJson's transport, pinned before it moves onto the shared http client (docs/62 §3.9).

const conn = (fetch: FetchLike, timeoutMs = 1_000) => ({ env: CRM_ENV, fetch, timeoutMs });
const raw =
  (body: string, init: ResponseInit = {}): FetchLike =>
  async () =>
    new Response(body, init);
async function failed(p: Promise<unknown>): Promise<WaError> {
  const e = await p.then(
    () => null,
    (x: unknown) => x,
  );
  if (e instanceof WaError) return e;
  throw new Error('expected a WaError');
}

describe('crmJson: the request', () => {
  it('sends the key, asks for JSON and types only a request with a body', async () => {
    const f = scriptedFetch({ status: 200, body: { data: 1 } }, { status: 200, body: { data: 2 } });
    await crmJson(conn(f.fetch), { path: 'messages', method: 'POST', body: { to: 'x' } });
    await crmJson(conn(f.fetch), { path: 'me' });
    const headers = {
      authorization: `Bearer ${CRM_ENV.apiKey}`,
      accept: 'application/json',
      'content-type': 'application/json',
    };
    expect(f.requests).toMatchObject([
      { url: `${CRM_ENV.base}/messages`, body: { to: 'x' }, init: { method: 'POST', headers } },
      { url: `${CRM_ENV.base}/me`, init: { method: 'GET', body: undefined } },
    ]);
    expect(f.requests[1]?.init.headers).not.toHaveProperty('content-type');
  });
});

describe('crmJson: a 2xx answer', () => {
  it('is the envelope’s data, or null for anything else', async () => {
    const data = scriptedFetch({ status: 200, body: { data: { id: 'm1' } } });
    expect(await crmJson(conn(data.fetch), { path: 'me' })).toEqual({ id: 'm1' });
    for (const body of ['{}', '[1]', 'not json', '']) {
      expect(await crmJson(conn(raw(body, { status: 200 })), { path: 'me' })).toBeNull();
    }
  });
});

describe('crmJson: a failed call', () => {
  it('keeps the CRM code of a long envelope and the Retry-After of a 429', async () => {
    const said = 'x'.repeat(400);
    const body = JSON.stringify({ error: { code: 'rate_limited', message: said } });
    const limited = raw(body, { status: 429, headers: { 'retry-after': '17' } });
    const e = await failed(crmJson(conn(limited), { path: 'me' }));
    expect(e.info).toMatchObject({ status: 429, crmCode: 'rate_limited', retryAfterMs: 17_000 });
  });

  it('a refused connection never left: the line is down, not uncertain', async () => {
    const refused = new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } });
    const e = await failed(crmJson(conn(scriptedFetch(refused).fetch), { path: 'me' }));
    expect(e.message).toBe('CRM request failed: fetch failed');
    expect(e.info).toMatchObject({ status: 0, uncertain: false, lineDown: true });
  });

  it('a call past its deadline is uncertain and counted as timed out', async () => {
    const hangs: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          reject(new DOMException('timed out', 'TimeoutError'));
        });
      });
    const e = await failed(crmJson(conn(hangs, 20), { path: 'me' }));
    expect(e.message).toBe('CRM request failed: The operation was aborted due to timeout');
    expect(e.info).toMatchObject({ status: 0, uncertain: true, timedOut: true });
  });
});
