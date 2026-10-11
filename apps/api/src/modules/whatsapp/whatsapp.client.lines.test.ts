import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpWhatsappClient } from './whatsapp.client';
import { RECORDED, scriptedFetch, STUB_ENV, templateRow } from './whatsapp.fakes';
import { CHAT_ENV, stubEnvs } from './whatsapp.lines.fakes';
import { WhatsappModule } from './whatsapp.module';
import { WaError } from './whatsapp.types';

const text = (c: HttpWhatsappClient, to = '+966551234567') => c.sendText({ to, text: 'السلام عليكم' });

function client(allowed?: readonly string[] | null) {
  const f = scriptedFetch(RECORDED.sendOk);
  return { c: new HttpWhatsappClient(STUB_ENV, { fetch: f.fetch, allowed }), requests: f.requests };
}

describe('HttpWhatsappClient per line (docs/12 §13.4)', () => {
  it('a client built from the chat env posts to the chat phone id with the chat token', async () => {
    const f = scriptedFetch(RECORDED.sendOk);
    const chat = new HttpWhatsappClient(CHAT_ENV, { fetch: f.fetch });
    await expect(text(chat)).resolves.toEqual({ waMessageId: 'wamid.d75640b5-fa48-4b20-bf51-8b9093173f42' });
    expect(f.requests[0]?.url).toBe('http://127.0.0.1:4010/v21.0/stub-chat-phone/messages');
    expect(f.requests[0]?.init.headers).toMatchObject({ authorization: 'Bearer chat-token' });
    expect(chat.canUploadSamples()).toBe(false);
  });

  it('an unconfigured line (null env) throws WaError code null / status 0 with zero requests', async () => {
    const f = scriptedFetch();
    const chat = new HttpWhatsappClient(null, { fetch: f.fetch, allowed: ['+966551234567'] });
    const err = await text(chat).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WaError);
    expect((err as WaError).info).toEqual({ code: null, status: 0 });
    expect(f.requests).toHaveLength(0);
  });
});

describe('HttpWhatsappClient allow-list (WA_ALLOWED_RECIPIENTS, docs/12 §13.5d)', () => {
  const sends = [
    { name: 'sendText', run: (c: HttpWhatsappClient, to: string) => text(c, to) },
    { name: 'sendTemplate', run: (c: HttpWhatsappClient, to: string) => c.sendTemplate({ to, template: templateRow(), params: {} }) },
    { name: 'sendDocument', run: (c: HttpWhatsappClient, to: string) => c.sendDocument({ to, url: 'https://s.local/r.pdf', filename: 'r.pdf' }) },
  ];

  it.each(sends)('$name to a number off the list → WaError 131030, zero requests', async ({ run }) => {
    const { c, requests } = client(['+201001234567']);
    const err = await run(c, '+966551234567').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WaError);
    expect((err as WaError).message).toBe('recipient not allowed');
    expect((err as WaError).info).toEqual({ code: 131030, status: 0 });
    expect(requests).toHaveLength(0);
  });

  it.each(['+201001234567', '201001234567'])('a listed number (%s) sends', async (to) => {
    const { c, requests } = client(['+201001234567']);
    await expect(text(c, to)).resolves.toMatchObject({ waMessageId: expect.any(String) });
    expect(requests).toHaveLength(1);
  });

  it('no list (undefined or null) sends to anyone; an empty list sends to no one', async () => {
    for (const allowed of [undefined, null]) {
      const { c, requests } = client(allowed);
      await text(c);
      expect(requests).toHaveLength(1);
    }
    const { c, requests } = client([]);
    await expect(text(c)).rejects.toMatchObject({ info: { code: 131030 } });
    expect(requests).toHaveLength(0);
  });

  it('markRead carries no recipient and is not gated by the client', async () => {
    const f = scriptedFetch(RECORDED.read);
    const c = new HttpWhatsappClient(STUB_ENV, { fetch: f.fetch, allowed: [] });
    await expect(c.markRead('wamid.x')).resolves.toBeUndefined();
    expect(f.requests).toHaveLength(1);
  });
});

describe('WhatsappModule boot warning (chatGaps, docs/12 §13.1)', () => {
  afterEach(() => {
    stubEnvs(null);
    vi.restoreAllMocks();
  });

  it('one warn naming the missing chat keys (never values); silent when no chat key is set', () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    stubEnvs({ WA_CHAT_PHONE_NUMBER_ID: 'chat-phone-secretish', WA_CHAT_WABA_ID: '', WA_CHAT_ACCESS_TOKEN: '', WA_ACCESS_TOKEN: '' });
    new WhatsappModule().onModuleInit();
    expect(warn).toHaveBeenCalledTimes(1);
    const message = String(warn.mock.calls[0]?.[0]);
    expect(message).toContain('WA_CHAT_WABA_ID, WA_CHAT_ACCESS_TOKEN');
    expect(message).not.toContain('chat-phone-secretish');
    stubEnvs({ WA_CHAT_PHONE_NUMBER_ID: '', WA_CHAT_APP_ID: '', WA_CHAT_APP_SECRET: '' });
    new WhatsappModule().onModuleInit();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
