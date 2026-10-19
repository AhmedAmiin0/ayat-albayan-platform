import { describe, expect, it } from 'vitest';
import { HttpWhatsappClient } from './whatsapp.client';
import { KAPSO_ENV, KAPSO_MEDIA, kapsoFetch, kapsoPage } from './kapso.fakes';
import { RECORDED, scriptedFetch, STUB_ENV, templateRow } from './whatsapp.fakes';

// The kapso driver (docs/19): same Cloud API paths and bodies, X-API-Key instead of a bearer, and
// the three differences: media, template paging and template edits. No network.

const client = (f: ReturnType<typeof kapsoFetch>, allowed: readonly string[] | null = null) =>
  new HttpWhatsappClient(KAPSO_ENV, { fetch: f.fetch, timeoutMs: 1_000, allowed });
const BASE = 'http://127.0.0.1:4010/kapso/v24.0';

describe('HttpWhatsappClient on kapso', () => {
  it('sends on the same path with X-API-Key and never a bearer', async () => {
    const f = kapsoFetch(RECORDED.sendOk, { status: 200, body: { success: true } });
    await expect(client(f).sendText({ to: '+966551234567', text: 'السلام عليكم' })).resolves.toEqual({
      waMessageId: 'wamid.d75640b5-fa48-4b20-bf51-8b9093173f42',
    });
    await client(f).markRead('wamid.in-1');
    for (const r of f.requests) {
      expect(r.headers).toMatchObject({ 'x-api-key': 'fake-kapso-key' });
      expect(r.headers).not.toHaveProperty('authorization');
    }
    expect(f.requests.map((r) => r.url)).toEqual([`${BASE}/stub-phone/messages`, `${BASE}/stub-phone/messages`]);
  });

  it('sendDocument({kind:"image"}): X-API-Key, no bearer, the same body as on meta (a first on kapso)', async () => {
    const input = { to: '+966551234567', kind: 'image' as const, url: 'https://s.local/a.jpg', caption: 'الواجب' };
    const kapso = scriptedFetch(RECORDED.sendOk);
    const meta = scriptedFetch(RECORDED.sendOk);
    await new HttpWhatsappClient(KAPSO_ENV, { fetch: kapso.fetch, timeoutMs: 1_000 }).sendDocument(input);
    await new HttpWhatsappClient(STUB_ENV, { fetch: meta.fetch, timeoutMs: 1_000 }).sendDocument(input);
    const [k] = kapso.requests;
    expect(k?.url).toBe(`${BASE}/stub-phone/messages`);
    expect(k?.init.headers).toMatchObject({ 'x-api-key': 'fake-kapso-key' });
    expect(k?.init.headers).not.toHaveProperty('authorization');
    expect(k?.body).toMatchObject({ type: 'image', image: { link: 'https://s.local/a.jpg', caption: 'الواجب' } });
    expect(k?.body).toEqual(meta.requests[0]?.body);
  });

  it('checks WA_ALLOWED_RECIPIENTS before any request, as on meta', async () => {
    const f = kapsoFetch();
    await expect(client(f, ['+966500000001']).sendText({ to: '+966551234567', text: 'x' })).rejects.toThrow('recipient not allowed');
    expect(f.requests).toHaveLength(0);
  });

  it('media: GET /{id}?phone_number_id=<line> with the key, then download_url with NO credential', async () => {
    const f = kapsoFetch({ status: 200, body: KAPSO_MEDIA }, { bytes: new Uint8Array([1, 2, 3]) });
    const media = await client(f).getMedia('m1');
    expect(media).toEqual({ bytes: new Uint8Array([1, 2, 3]), mime: 'image/jpeg' });
    const [meta, download] = f.requests;
    expect(meta?.url).toBe(`${BASE}/m1?phone_number_id=stub-phone`);
    expect(meta?.headers).toMatchObject({ 'x-api-key': 'fake-kapso-key' });
    expect(download?.url).toBe(KAPSO_MEDIA.download_url);
    expect(download?.headers).toEqual({});
    expect(f.requests.some((r) => r.url.includes('lookaside'))).toBe(false);
  });

  it('media without a download_url is refused, never falling back to the lookaside url', async () => {
    const f = kapsoFetch({ status: 200, body: { ...KAPSO_MEDIA, download_url: undefined } });
    await expect(client(f).getMedia('m1')).rejects.toThrow('Unexpected WhatsApp response');
    expect(f.requests).toHaveLength(1);
  });

  it('templates: keeps paging while `after` is set and the page is full (no paging.next)', async () => {
    const full = Array.from({ length: 100 }, (_, i) => `t${i}`);
    const f = kapsoFetch(kapsoPage(full, 'c1'), kapsoPage(['last'], 'c2'));
    expect(await client(f).getTemplates()).toHaveLength(101);
    expect(f.requests).toHaveLength(2);
    expect(f.requests[1]?.url).toContain('&after=c1');
    const short = kapsoFetch(kapsoPage(['a', 'b'], 'c1'));
    expect(await client(short).getTemplates()).toHaveLength(2);
    expect(short.requests).toHaveLength(1);
  });

  it('templates: a full page without a cursor ends the list; the page cap still holds', async () => {
    const full = Array.from({ length: 100 }, (_, i) => `t${i}`);
    expect(await client(kapsoFetch(kapsoPage(full))).getTemplates()).toHaveLength(100);
    const endless = kapsoFetch(...Array.from({ length: 25 }, () => kapsoPage(full, 'again')));
    await client(endless).getTemplates();
    expect(endless.requests).toHaveLength(20);
  });

  it('a rejected template is edited through /{waba}/message_templates?hsm_id=, a new one created', async () => {
    const f = kapsoFetch({ status: 200, body: { success: true } }, { status: 200, body: { id: 'new-1', status: 'PENDING' } });
    const rejected = templateRow({ status: 'rejected', meta_id: '1234567890' });
    await expect(client(f).submitTemplate(rejected)).resolves.toEqual({ metaId: '1234567890', status: 'PENDING' });
    expect(f.requests[0]?.url).toBe(`${BASE}/stub-waba/message_templates?hsm_id=1234567890`);
    await expect(client(f).submitTemplate(templateRow({ status: 'not_submitted' }))).resolves.toEqual({ metaId: 'new-1', status: 'PENDING' });
    expect(f.requests[1]?.url).toBe(`${BASE}/stub-waba/message_templates`);
  });

  it('no resumable upload on kapso: canUploadSamples() false and uploadSample makes no request', async () => {
    const f = kapsoFetch();
    expect(client(f).canUploadSamples()).toBe(false);
    const file = { name: 's.pdf', mime: 'application/pdf', bytes: new Uint8Array([1]) };
    await expect(client(f).uploadSample(file)).rejects.toThrow('WA_APP_ID is not set');
    expect(f.requests).toHaveLength(0);
    expect(new HttpWhatsappClient({ ...STUB_ENV, appId: 'app' }).canUploadSamples()).toBe(true);
  });
});
