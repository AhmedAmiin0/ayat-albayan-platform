import { describe, expect, it } from 'vitest';
import { whatsappClient } from '@/modules/messaging/whatsapp/client-factory';
import { HttpWhatsappClient } from '@/modules/messaging/whatsapp/whatsapp.client';
import { KAPSO_ENV } from '@/modules/messaging/whatsapp/drivers/kapso/kapso.fakes';
import { CRM_ENV } from '@/modules/messaging/whatsapp/drivers/crm/crm.fakes';
import { EVO_BAILEYS } from '@/modules/messaging/whatsapp/drivers/evolution/evolution.fakes';
import { RECORDED, scriptedFetch, STUB_ENV } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { voiceForm, voiceIdMessage } from './meta-voice';

// A voice note by uploaded media id (2026-11-14): POST /{phone}/media then {audio:{id, voice}}.
// Fake fetch only: no real network.

const OGG = new TextEncoder().encode('OggS-opus');
const UPLOADED = { status: 200, body: { id: 'media-1' } };
const voiceOf = (env: typeof STUB_ENV | typeof KAPSO_ENV, f: ReturnType<typeof scriptedFetch>) =>
  new HttpWhatsappClient(env, { fetch: f.fetch, timeoutMs: 1_000 }).voice();

describe('voiceForm', () => {
  it('messaging_product, the BARE audio/ogg type and voice.ogg as audio/ogg', () => {
    const form = voiceForm(OGG);
    expect(form.get('messaging_product')).toBe('whatsapp');
    expect(form.get('type')).toBe('audio/ogg');
    const file = form.get('file');
    expect(file).toBeInstanceOf(File);
    expect(file instanceof File ? [file.name, file.type, file.size] : []).toEqual(['voice.ogg', 'audio/ogg', OGG.byteLength]);
  });
});

describe('voiceIdMessage', () => {
  it('audio by id with voice:true, a reply as context', () => {
    expect(voiceIdMessage({ to: '+966551234567', id: 'media-1', replyTo: 'wamid.q' })).toEqual({
      messaging_product: 'whatsapp', recipient_type: 'individual', to: '966551234567',
      type: 'audio', audio: { id: 'media-1', voice: true }, context: { message_id: 'wamid.q' },
    });
  });
});

describe('HttpWhatsappClient.voice()', () => {
  it('meta: uploads to /{phone}/media with the bearer, multipart, then sends by id', async () => {
    const f = scriptedFetch(UPLOADED, RECORDED.sendOk);
    const voice = voiceOf(STUB_ENV, f);
    await expect(voice?.upload(OGG)).resolves.toBe('media-1');
    await voice?.send({ to: '+966551234567', id: 'media-1' });
    const [up, send] = f.requests;
    expect(up?.url).toMatch(/\/stub-phone\/media$/);
    expect(up?.init.method).toBe('POST');
    expect(up?.init.body).toBeInstanceOf(FormData);
    expect(up?.init.headers).toHaveProperty('authorization');
    expect(up?.init.headers).not.toHaveProperty('content-type');
    expect(send?.url).toMatch(/\/stub-phone\/messages$/);
    expect(send?.body).toMatchObject({ type: 'audio', audio: { id: 'media-1', voice: true } });
  });

  it('kapso: the same path on its Meta proxy with X-API-Key, never a bearer', async () => {
    const f = scriptedFetch(UPLOADED);
    await voiceOf(KAPSO_ENV, f)?.upload(OGG);
    const [up] = f.requests;
    expect(up?.url).toBe('http://127.0.0.1:4010/kapso/v24.0/stub-phone/media');
    expect(up?.init.headers).toMatchObject({ 'x-api-key': 'fake-kapso-key' });
    expect(up?.init.headers).not.toHaveProperty('authorization');
  });

  it('a refused upload throws (the dispatch falls back); unconfigured, crm and evolution: none', async () => {
    const refused = { status: 400, body: { error: { code: 131053, message: 'Media upload error' } } };
    await expect(voiceOf(STUB_ENV, scriptedFetch(refused))?.upload(OGG)).rejects.toThrow();
    expect(new HttpWhatsappClient(null).voice()).toBeNull();
    expect(whatsappClient(CRM_ENV).voice?.() ?? null).toBeNull();
    expect(whatsappClient(EVO_BAILEYS).voice?.() ?? null).toBeNull();
  });
});
