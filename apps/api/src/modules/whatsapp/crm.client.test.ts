import { describe, expect, it } from 'vitest';
import { CrmWhatsappClient } from './crm.client';
import { CRM_ENV, CRM_SENT, crmFailure } from './crm.fakes';
import { scriptedFetch, templateRow } from './whatsapp.fakes';
import { WaError } from './whatsapp.types';

// docs/19 «crm driver»: CrmWhatsappClient over the CRM's REST API. No network.

const TO = '+966500000001';
const client = (f: ReturnType<typeof scriptedFetch>, allowed: readonly string[] | null = null) =>
  new CrmWhatsappClient(CRM_ENV, { fetch: f.fetch, timeoutMs: 1_000, allowed });
const send = { to: TO, template: templateRow(), params: { '1': 'سارة', '2': 'الأحد', button: 'room-1' } };

async function failure(p: Promise<unknown>): Promise<WaError['info']> {
  const e = await p.then(() => null, (x: unknown) => x);
  if (!(e instanceof WaError)) throw new Error('expected a WaError');
  return e.info;
}

describe('CrmWhatsappClient', () => {
  it('POSTs {base}/messages with the Bearer key; the wamid is whatsapp_message_id', async () => {
    const f = scriptedFetch(CRM_SENT);
    await expect(client(f).sendTemplate(send)).resolves.toEqual({ waMessageId: 'wamid.crm-1' });
    expect(f.requests[0]?.url).toBe('http://127.0.0.1:4010/crm/api/v1/messages');
    expect(f.requests[0]?.init.method).toBe('POST');
    expect(f.requests[0]?.init.headers).toMatchObject({ authorization: 'Bearer fake-crm-key', 'content-type': 'application/json' });
    expect(f.requests[0]?.body).toMatchObject({ to: TO, type: 'template', template: { name: 'booking_confirmation', language: 'ar' } });
  });

  it('text drops the reply-to; a document goes by media_url', async () => {
    const f = scriptedFetch(CRM_SENT, CRM_SENT);
    await client(f).sendText({ to: TO, text: 'نعم', replyTo: 'wamid.in-1' });
    await client(f).sendDocument({ to: TO, url: 'https://s.local/a.pdf', filename: 'a.pdf' });
    expect(f.requests.map((r) => r.body)).toEqual([
      { to: TO, type: 'text', text: 'نعم' },
      { to: TO, type: 'document', media_url: 'https://s.local/a.pdf', filename: 'a.pdf' },
    ]);
  });

  it('the allow-list and an unconfigured line refuse before any request', async () => {
    const f = scriptedFetch();
    expect(await failure(client(f, ['+966500000009']).sendText({ to: TO, text: 'x' }))).toMatchObject({ code: 131030, status: 0 });
    expect(await failure(new CrmWhatsappClient(null).sendText({ to: TO, text: 'x' }))).toMatchObject({ code: null, status: 0 });
    expect(new CrmWhatsappClient(null).configured()).toBe(false);
    expect(f.requests).toHaveLength(0);
  });

  it('401 / 403: a credential hold tagged crm (the line is held, rows stay queued)', async () => {
    for (const [status, code] of [[401, 'unauthorized'], [403, 'forbidden']] as const) {
      const info = await failure(client(scriptedFetch(crmFailure(status, code))).sendTemplate(send));
      expect(info).toMatchObject({ status, credential: 'crm', crmCode: code });
      expect(info.uncertain).toBeUndefined();
    }
  });

  it('429: retry after Retry-After; 502 meta_error / 500 template_malformed / 400: fail with the code, not uncertain', async () => {
    const limited = async () => new Response(JSON.stringify(crmFailure(429, 'rate_limited').body), { status: 429, headers: { 'retry-after': '17' } });
    expect(await failure(new CrmWhatsappClient(CRM_ENV, { fetch: limited }).sendText({ to: TO, text: 'x' }))).toMatchObject({ retryAfterMs: 17_000 });
    for (const [status, code] of [[502, 'meta_error'], [500, 'template_malformed'], [400, 'bad_request'], [404, 'not_found']] as const) {
      const info = await failure(client(scriptedFetch(crmFailure(status, code, 'Meta said no'))).sendTemplate(send));
      expect(info).toMatchObject({ status, crmCode: code, details: 'Meta said no' });
      expect(info.uncertain).toBeUndefined();
      expect(info.credential).toBeUndefined();
    }
  });

  it('500 internal, another 5xx, a timeout or a lost connection: uncertain (never resent); a refused connection is not', async () => {
    expect(await failure(client(scriptedFetch(crmFailure(500, 'internal'))).sendTemplate(send))).toMatchObject({ uncertain: true, crmCode: 'internal' });
    const gateway = async () => new Response('<html>bad gateway</html>', { status: 502 });
    expect(await failure(new CrmWhatsappClient(CRM_ENV, { fetch: gateway }).sendTemplate(send))).toMatchObject({ uncertain: true, crmCode: 'http_502' });
    const timeout = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    expect(await failure(client(scriptedFetch(timeout)).sendTemplate(send))).toMatchObject({ status: 0, uncertain: true });
    const refused = new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } });
    expect(await failure(client(scriptedFetch(refused)).sendTemplate(send))).toMatchObject({ status: 0, uncertain: false });
    expect(await failure(client(scriptedFetch({ status: 201, body: { data: {} } })).sendTemplate(send))).toMatchObject({ uncertain: true });
  });

  it('markRead is a no-op; templates, samples and media are «not supported by the crm driver»', async () => {
    const f = scriptedFetch();
    await client(f).markRead();
    expect(client(f).canUploadSamples()).toBe(false);
    for (const call of [client(f).getTemplates(), client(f).submitTemplate(), client(f).uploadSample(), client(f).getMedia()]) {
      expect(await failure(call)).toMatchObject({ unsupported: 'crm', code: null, status: 0 });
    }
    expect(f.requests).toHaveLength(0);
  });
});
