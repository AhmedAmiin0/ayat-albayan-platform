import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LinesCheck } from './lines.check';
import { LINES_RECORDED as R, stubEnvs } from './whatsapp.lines.fakes';
import { WhatsappModule } from './whatsapp.module';

// docs/19: «افحص الخطوط» and the boot log show each line's driver and NAME what a kapso line lacks.

const KAPSO_BASE = 'http://127.0.0.1:4010/kapso';
const IDS = { WA_PHONE_NUMBER_ID: 'n-phone', WA_WABA_ID: 'n-waba', WA_APP_ID: 'app-notifications' };
const NO_CHAT = { WA_CHAT_PHONE_NUMBER_ID: '', WA_CHAT_WABA_ID: '', WA_CHAT_ACCESS_TOKEN: '', WA_CHAT_APP_ID: '', WA_CHAT_APP_SECRET: '' };

function checker() {
  const requests: { url: string; headers: Record<string, string> }[] = [];
  const lines = new LinesCheck();
  lines.fetch = async (url, init) => {
    requests.push({ url, headers: { ...(init.headers as Record<string, string>) } });
    const body = url.includes('subscribed_apps') ? R.subscribed.body : R.phone.body;
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  return { lines, requests };
}

afterEach(() => {
  stubEnvs(null);
  vi.restoreAllMocks();
});

describe('LinesCheck on a kapso line', () => {
  it('configured: provider kapso, no gaps, app_id null (WA_APP_ID ignored), both GETs with X-API-Key', async () => {
    stubEnvs({ ...IDS, ...NO_CHAT, WA_PROVIDER: 'kapso', KAPSO_API_BASE: KAPSO_BASE, KAPSO_API_KEY: 'fake-kapso-key', WA_ACCESS_TOKEN: '' });
    const { lines, requests } = checker();
    const [notifications] = await lines.check();
    expect(notifications).toMatchObject({
      line: 'notifications', configured: true, provider: 'kapso', gaps: [], app_id: null, phone_number_id: 'n-phone', kapso_webhook_secret: false,
    });
    expect(requests.map((r) => r.url.split('?')[0])).toEqual([`${KAPSO_BASE}/v24.0/n-phone`, `${KAPSO_BASE}/v24.0/n-waba/subscribed_apps`]);
    for (const r of requests) {
      expect(r.headers['x-api-key']).toBe('fake-kapso-key');
      expect(r.headers).not.toHaveProperty('authorization');
    }
    expect(JSON.stringify(notifications)).not.toContain('fake-kapso-key');
  });

  it('half-configured: configured false, provider kapso, the missing keys named, no request', async () => {
    stubEnvs({ ...IDS, ...NO_CHAT, WA_PROVIDER: 'kapso', KAPSO_API_BASE: '', KAPSO_API_KEY: 'fake-kapso-key' });
    const { lines, requests } = checker();
    const [notifications] = await lines.check();
    expect(notifications).toMatchObject({ configured: false, provider: 'kapso', gaps: ['KAPSO_API_BASE'] });
    stubEnvs({ KAPSO_WEBHOOK_SECRET: 'fake-kapso-webhook-secret' });
    const [again, chat] = await lines.check();
    expect(again?.kapso_webhook_secret).toBe(true);
    expect(JSON.stringify(again)).not.toContain('fake-kapso-webhook-secret');
    expect(chat).not.toHaveProperty('kapso_webhook_secret');
    expect(requests).toHaveLength(0);
  });

  it('Kapso refusing its key: each errors[] entry carries credential kapso (the web says kapso_auth), never the key', async () => {
    stubEnvs({ ...IDS, ...NO_CHAT, WA_PROVIDER: 'kapso', KAPSO_API_BASE: KAPSO_BASE, KAPSO_API_KEY: 'fake-kapso-key', WA_ACCESS_TOKEN: '' });
    const lines = new LinesCheck();
    lines.fetch = async () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    const [notifications] = await lines.check();
    expect(notifications?.errors.map((e) => [e.step, e.code, e.credential])).toEqual([['phone', null, 'kapso'], ['subscribed_apps', null, 'kapso']]);
    expect(JSON.stringify(notifications)).not.toContain('fake-kapso-key');
  });
});

describe('WhatsappModule boot warning on a kapso line', () => {
  it('names the line, its driver and the missing keys, never a value', () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    stubEnvs({ ...IDS, ...NO_CHAT, WA_PROVIDER: 'kapso', KAPSO_API_BASE: KAPSO_BASE, KAPSO_API_KEY: '' });
    new WhatsappModule().onModuleInit();
    expect(warn).toHaveBeenCalledTimes(1);
    const message = String(warn.mock.calls[0]?.[0]);
    expect(message).toContain('notifications line (kapso)');
    expect(message).toContain('KAPSO_API_KEY');
    expect(message).not.toContain('n-phone');
    expect(message).not.toContain(KAPSO_BASE);
  });
});
