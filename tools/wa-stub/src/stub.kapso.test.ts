import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { bearer, closeAll, post, startHook, startStub, templateBody } from './test-server.ts';

// docs/19: Kapso's Meta proxy under /kapso — X-API-Key only, phone_number_id on media, hsm_id edits.

afterEach(closeAll);

const KEY = { 'x-api-key': 'fake-kapso-key' };
const MSG = '/kapso/v24.0/PN1/messages';
const text = { messaging_product: 'whatsapp', to: '966598917071', type: 'text', text: { body: 'x' } };

async function setup() {
  const hook = await startHook();
  const kapso = { apiKey: 'fake-kapso-key', webhookUrl: hook.url, webhookSecret: 'fake-kapso-secret' };
  const { url, stub } = await startStub({ phoneNumberId: 'PN1', enforceWindow: false, kapso });
  return { hook, url, stub };
}

describe('wa-stub: the kapso prefix', () => {
  it('sends with X-API-Key and records the credential kind per request', async () => {
    const { url, stub } = await setup();
    expect((await post(`${url}${MSG}`, templateBody('lesson_reminder_v2', 2), KEY)).status).toBe(200);
    expect((await post(`${url}/v21.0/PN1/messages`, text, bearer('t'))).status).toBe(200);
    expect(stub.sent.map((m) => m.phoneNumberId)).toEqual(['PN1', 'PN1']);
    expect(stub.state.requests.map((r) => [r.via, r.auth])).toEqual([['kapso', 'api-key'], ['graph', 'bearer']]);
    const log = (await (await fetch(`${url}/__stub/requests`)).json()) as unknown[];
    expect(log).toHaveLength(2);
  });

  it('refuses a Bearer (even with a key), no key and a wrong key; nothing is sent', async () => {
    const { url, stub } = await setup();
    expect((await post(`${url}${MSG}`, text, bearer('fake-kapso-key'))).status).toBe(401);
    expect((await post(`${url}${MSG}`, text, { ...KEY, ...bearer('x') })).status).toBe(401);
    expect((await post(`${url}${MSG}`, text, {})).status).toBe(401);
    expect((await post(`${url}${MSG}`, text, { 'x-api-key': 'other' })).status).toBe(401);
    expect(stub.sent).toHaveLength(0);
    expect(stub.state.requests.map((r) => r.auth)).toEqual(['bearer', 'bearer', 'none', 'api-key']);
  });

  it('media: phone_number_id required; download_url serves the bytes only WITHOUT credentials', async () => {
    const { url, stub } = await setup();
    stub.state.media.set('ab12', { mime: 'image/jpeg', bytes: Buffer.from([1, 2, 3]) });
    expect((await fetch(`${url}/kapso/v24.0/ab12`, { headers: KEY })).status).toBe(400);
    const res = await fetch(`${url}/kapso/v24.0/ab12?phone_number_id=PN1`, { headers: KEY });
    const meta = (await res.json()) as { url: string; download_url: string; mime_type: string };
    expect(meta.mime_type).toBe('image/jpeg');
    expect(meta.url).toContain('lookaside');
    expect((await fetch(meta.download_url, { headers: KEY })).status).toBe(400);
    expect((await fetch(meta.download_url, { headers: bearer('t') })).status).toBe(400);
    const bytes = await fetch(meta.download_url);
    expect(new Uint8Array(await bytes.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('templates: listed with cursors and no paging.next; edited only via ?hsm_id=, no /{template id}', async () => {
    const { url, stub } = await setup();
    const list = (await (await fetch(`${url}/kapso/v24.0/stub-waba/message_templates?limit=100`, { headers: KEY })).json()) as {
      data: { id: string; name: string }[];
      paging: Record<string, unknown>;
    };
    expect(list.data.length).toBeGreaterThan(0);
    expect(list.paging).not.toHaveProperty('next');
    const id = list.data[0]?.id ?? '';
    expect((await post(`${url}/kapso/v24.0/${id}`, { category: 'UTILITY' }, KEY)).status).toBe(404);
    const edit = await post(`${url}/kapso/v24.0/stub-waba/message_templates?hsm_id=${id}`, { category: 'UTILITY', components: [] }, KEY);
    expect(edit.status).not.toBe(404);
    expect((await post(`${url}/kapso/v21.0/APP/uploads?file_name=a`, {}, KEY)).status).toBe(404);
    expect(stub.state.requests.every((r) => r.via === 'kapso')).toBe(true);
  });

  it('POST /__stub/kapso/inbound forwards the raw Meta payload with X-Webhook-Signature (hex)', async () => {
    const { hook, url } = await setup();
    const res = await post(`${url}/__stub/kapso/inbound`, { from: '966598917071', text: 'السلام عليكم' });
    expect(await res.json()).toMatchObject({ forwarded: true, status: 200 });
    const got = hook.received[0];
    expect(got?.sig).toBeUndefined();
    expect(got?.kapsoSig).toBe(createHmac('sha256', 'fake-kapso-secret').update(got?.body ?? '').digest('hex'));
    expect(JSON.parse(got?.body ?? '{}')).toMatchObject({ object: 'whatsapp_business_account' });
    await post(`${url}/__stub/kapso/inbound`, { from: '966598917071', text: 'x', signWith: 'wrong' });
    expect(hook.received[1]?.kapsoSig).toBe(createHmac('sha256', 'wrong').update(hook.received[1]?.body ?? '').digest('hex'));
  });
});
