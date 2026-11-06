import { evolutionConfigSchema } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { EVO_BAILEYS } from '@/modules/messaging/whatsapp/drivers/evolution/evolution.fakes';
import { syncEvolution, type PushTarget } from './evolution-push';

// Owner 2026-11-06: every option pushed to Evolution on save and read back. All HTTP is faked
// (never a real Evolution): one answer per «METHOD path».

interface Reply { status: number; body: unknown }

function routed(routes: Record<string, Reply>) {
  const calls: { key: string; body: unknown; apikey: unknown }[] = [];
  const fetch = async (url: string, init: RequestInit): Promise<Response> => {
    const key = `${init.method ?? 'GET'} ${new URL(url).pathname}`;
    const headers = new Headers(init.headers);
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ key, body, apikey: headers.get('apikey') });
    const r = routes[key] ?? { status: 500, body: { error: 'unscripted' } };
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } });
  };
  return { fetch, calls };
}

const URL_OK = 'http://api:3000/webhooks/evolution/secondary-1';
const config = evolutionConfigSchema.parse({ webhook: { url: URL_OK } });
const OPEN = { status: 200, body: { instance: { state: 'open' } } };
const OK = { status: 201, body: {} };
const SETTINGS = {
  rejectCall: false, msgCall: '', groupsIgnore: true, alwaysOnline: false, readMessages: false,
  readStatus: false, syncFullHistory: false,
};
const HOOK = {
  enabled: true, url: URL_OK, webhookByEvents: false, webhookBase64: false,
  events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'SEND_MESSAGE', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
};
const finds = (over: Record<string, Reply> = {}): Record<string, Reply> => ({
  'GET /instance/connectionState/secondary-1': OPEN,
  'POST /settings/set/secondary-1': OK, 'GET /settings/find/secondary-1': { status: 200, body: SETTINGS },
  'POST /webhook/set/secondary-1': OK, 'GET /webhook/find/secondary-1': { status: 200, body: HOOK },
  'POST /proxy/set/secondary-1': OK, 'GET /proxy/find/secondary-1': { status: 200, body: { enabled: false } },
  ...over,
});
const target = (f: ReturnType<typeof routed>, over: Partial<PushTarget> = {}): PushTarget =>
  ({ env: EVO_BAILEYS, config, globalKey: 'fake-global', proxyPassword: null, fetch: f.fetch, ...over });
const NOW = new Date('2026-11-06T10:00:00Z');

describe('syncEvolution', () => {
  it('pushes settings, webhook and proxy with the instance key, then reads them back: synced', async () => {
    const f = routed(finds());
    const view = await syncEvolution(target(f), { push: true, now: NOW });
    expect(view).toEqual({
      synced: true, checked_at: NOW.toISOString(),
      parts: { instance: 'synced', settings: 'synced', webhook: 'synced', proxy: 'synced' },
    });
    const hook = f.calls.find((c) => c.key === 'POST /webhook/set/secondary-1');
    expect(hook?.body).toMatchObject({ webhook: { url: URL_OK, headers: { 'x-evolution-token': 'fake-instance-token' } } });
    expect(f.calls.every((c) => c.apikey === 'fake-instance-token')).toBe(true);
    expect(f.calls.find((c) => c.key === 'POST /proxy/set/secondary-1')?.body).toMatchObject({ enabled: false });
  });

  it('a value read back different is drift; a refused part is failed; the others still go', async () => {
    const f = routed(finds({
      'GET /settings/find/secondary-1': { status: 200, body: { ...SETTINGS, groupsIgnore: false } },
      'POST /proxy/set/secondary-1': { status: 400, body: { response: { message: 'Invalid proxy' } } },
    }));
    const view = await syncEvolution(target(f), { push: true, now: NOW });
    expect(view.parts).toEqual({ instance: 'synced', settings: 'drift', webhook: 'synced', proxy: 'failed' });
    expect(view.synced).toBe(false);
  });

  it('creates a missing instance with the global key (no QR), the instance token inside', async () => {
    const f = routed(finds({
      'GET /instance/connectionState/secondary-1': { status: 404, body: { response: { message: 'not found' } } },
      'POST /instance/create': OK,
    }));
    await syncEvolution(target(f), { push: true, now: NOW });
    const create = f.calls.find((c) => c.key === 'POST /instance/create');
    expect(create?.apikey).toBe('fake-global');
    expect(create?.body).toMatchObject({
      instanceName: 'secondary-1', integration: 'WHATSAPP-BAILEYS', token: 'fake-instance-token', qrcode: false,
    });
  });

  it('a read back writes nothing; no webhook URL yet = skipped; the token refused throws', async () => {
    const f = routed(finds());
    const noHook = evolutionConfigSchema.parse({});
    const view = await syncEvolution(target(f, { config: noHook }), { push: false, now: NOW });
    expect(view.parts.webhook).toBe('skipped');
    expect(f.calls.some((c) => c.key.startsWith('POST'))).toBe(false);
    const denied = routed({ 'GET /instance/connectionState/secondary-1': { status: 401, body: {} } });
    await expect(syncEvolution(target(denied), { push: true, now: NOW }))
      .rejects.toMatchObject({ info: { credential: 'evolution' } });
  });
});
