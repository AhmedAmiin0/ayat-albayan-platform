import { describe, expect, it } from 'vitest';
import { scriptedFetch, templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { EvolutionWhatsappClient } from './evolution.client';
import { EVO_BAILEYS, EVO_CLOUD, evoSent, noWait } from './evolution.fakes';

// docs/19 «Evolution driver»: the client over Evolution API v2. All HTTP is scripted.

const TO = '+966500000001';
type F = ReturnType<typeof scriptedFetch>;
const client = (f: F, env = EVO_BAILEYS, allowed: readonly string[] | null = null) =>
  new EvolutionWhatsappClient(env, { fetch: f.fetch, timeoutMs: 1_000, allowed, pacer: noWait() });
const send = { to: TO, template: templateRow(), params: { '1': 'سارة', '2': 'الأحد', button: 'room-1' } };

describe('EvolutionWhatsappClient — session messages', () => {
  it('text: POST {base}/message/sendText/{instance}, apikey = the instance token, the id kept', async () => {
    const f = scriptedFetch(evoSent());
    await expect(client(f).sendText({ to: TO, text: 'السلام عليكم' })).resolves.toEqual({ waMessageId: 'EVO-MSG-1' });
    expect(f.requests[0]?.url).toBe('https://evo.example.test/message/sendText/secondary-1');
    expect(f.requests[0]?.init.method).toBe('POST');
    expect(f.requests[0]?.init.headers).toMatchObject({ apikey: 'fake-instance-token' });
    expect(f.requests[0]?.body).toEqual({ number: '966500000001', text: 'السلام عليكم' });
  });

  it('a reply quotes the message by its id', async () => {
    const f = scriptedFetch(evoSent());
    await client(f).sendText({ to: TO, text: 'نعم', replyTo: 'EVO-IN-9' });
    expect(f.requests[0]?.body).toMatchObject({ quoted: { key: { id: 'EVO-IN-9' } } });
  });

  it('image, video and document by link through sendMedia; the file name on a document only', async () => {
    const f = scriptedFetch(evoSent('a'), evoSent('b'), evoSent('c'));
    const url = 'https://files.example.test/x';
    await client(f).sendDocument({ to: TO, kind: 'image', url, caption: 'صورة', filename: 'x.jpg' });
    await client(f).sendDocument({ to: TO, kind: 'video', url });
    await client(f).sendDocument({ to: TO, url, filename: 'تقرير.pdf' });
    expect(f.requests.map((r) => r.url)).toEqual(Array(3).fill('https://evo.example.test/message/sendMedia/secondary-1'));
    expect(f.requests[0]?.body).toEqual({ number: '966500000001', mediatype: 'image', media: url, caption: 'صورة' });
    expect(f.requests[1]?.body).toMatchObject({ mediatype: 'video', media: url });
    expect(f.requests[2]?.body).toMatchObject({ mediatype: 'document', fileName: 'تقرير.pdf' });
  });

  it('an audio goes as a voice note through sendWhatsAppAudio', async () => {
    const f = scriptedFetch(evoSent());
    await client(f).sendDocument({ to: TO, kind: 'audio', url: 'https://files.example.test/v.ogg', voice: true });
    expect(f.requests[0]?.url).toBe('https://evo.example.test/message/sendWhatsAppAudio/secondary-1');
    expect(f.requests[0]?.body).toEqual({ number: '966500000001', audio: 'https://files.example.test/v.ogg' });
  });

  it('the allow-list refuses before any request', async () => {
    const f = scriptedFetch();
    const e = await client(f, EVO_BAILEYS, ['+966500000002']).sendText({ to: TO, text: 'x' }).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(WaError);
    expect(f.requests).toHaveLength(0);
  });

  it('a 2xx without the message id is uncertain (never resent)', async () => {
    const f = scriptedFetch({ status: 201, body: { ok: true } });
    const e = await client(f).sendText({ to: TO, text: 'x' }).catch((x: unknown) => x);
    expect(e instanceof WaError && e.info.uncertain).toBe(true);
  });
});

describe('EvolutionWhatsappClient — templates', () => {
  it('Baileys: the registry body with its values, footer and link button as plain text, flagged', async () => {
    const f = scriptedFetch(evoSent());
    await expect(client(f).sendTemplate(send)).resolves.toEqual({ waMessageId: 'EVO-MSG-1', asText: true });
    expect(f.requests[0]?.url).toBe('https://evo.example.test/message/sendText/secondary-1');
    expect(f.requests[0]?.body).toEqual({
      number: '966500000001',
      text: 'تم حجز حلقة سارة — الأحد\n\nأكاديمية آيات البيان\nhttps://meet.jit.si/room-1',
    });
  });

  it('Cloud: passes the WABA template through sendTemplate with Meta components', async () => {
    const f = scriptedFetch(evoSent('wamid.CLOUD'));
    await expect(client(f, EVO_CLOUD).sendTemplate(send)).resolves.toEqual({ waMessageId: 'wamid.CLOUD' });
    expect(f.requests[0]?.url).toBe('https://evo.example.test/message/sendTemplate/cloud-1');
    expect(f.requests[0]?.body).toMatchObject({ number: '966500000001', name: 'booking_confirmation', language: 'ar' });
    expect(f.requests[0]?.body).toMatchObject({ components: [{ type: 'body' }, { type: 'button', sub_type: 'url' }] });
  });

  it('automaticOff: true on Baileys with automatic sends off only', () => {
    const f = scriptedFetch();
    expect(client(f).automaticOff()).toBe(true);
    expect(client(f, { ...EVO_BAILEYS, autoSends: true }).automaticOff()).toBe(false);
    expect(client(f, EVO_CLOUD).automaticOff()).toBe(false);
  });

  it('no template list, submit or samples; markRead calls nothing', async () => {
    const f = scriptedFetch();
    const c = client(f);
    await expect(c.getTemplates()).rejects.toMatchObject({ info: { unsupported: 'evolution' } });
    await expect(c.submitTemplate()).rejects.toMatchObject({ info: { unsupported: 'evolution' } });
    expect(c.canUploadSamples()).toBe(false);
    await expect(c.markRead()).resolves.toBeUndefined();
    expect(f.requests).toHaveLength(0);
  });

  it('not configured: every call refuses before any request', async () => {
    const c = new EvolutionWhatsappClient(null);
    expect(c.configured()).toBe(false);
    await expect(c.sendText({ to: TO, text: 'x' })).rejects.toMatchObject({ info: { code: null, status: 0 } });
  });
});
