import { afterEach, describe, expect, it, vi } from 'vitest';
import { crmFailure } from './crm.fakes';
import { LinesCheck } from './lines.check';
import { scriptedFetch } from './whatsapp.fakes';

// docs/19 «crm driver»: «افحص الخطوط» on a crm line = GET /me only, never a test message, never a Graph call.

afterEach(() => vi.unstubAllEnvs());

function crmLine(secret = true) {
  vi.stubEnv('WA_PROVIDER', 'crm');
  vi.stubEnv('WACRM_API_BASE', 'http://127.0.0.1:4010/crm/api/v1');
  vi.stubEnv('WACRM_API_KEY', 'fake-crm-key');
  vi.stubEnv('WACRM_WEBHOOK_SECRET', secret ? 'fake-hook' : '');
  vi.stubEnv('WA_CHAT_PHONE_NUMBER_ID', '');
}

async function check(...replies: Parameters<typeof scriptedFetch>) {
  const f = scriptedFetch(...replies);
  const lines = new LinesCheck();
  lines.fetch = f.fetch;
  const [notifications] = await lines.check();
  return { view: notifications, requests: f.requests };
}

const me = (scopes: string[]) => ({ status: 200, body: { data: { account: { id: 'a', name: 'Academy' }, key: { id: 'k', scopes } } } });

describe('LinesCheck on a crm line', () => {
  it('ok: GET {base}/me with the Bearer key, scope messages:send, the webhook secret set; no Meta ids', async () => {
    crmLine();
    const { view, requests } = await check(me(['messages:send']));
    expect(requests.map((r) => [r.init.method ?? 'GET', r.url])).toEqual([['GET', 'http://127.0.0.1:4010/crm/api/v1/me']]);
    expect(requests[0]?.init.headers).toMatchObject({ authorization: 'Bearer fake-crm-key' });
    expect(view).toMatchObject({
      provider: 'crm', configured: true, gaps: [], crm_send_scope: true, crm_webhook_secret: true,
      phone_number_id: null, waba_id: null, app_id: null, subscribed_apps: null, errors: [],
    });
    expect(JSON.stringify(view)).not.toContain('fake-crm-key');
  });

  it('a key without messages:send, and the webhook secret unset', async () => {
    crmLine(false);
    const { view } = await check(me(['contacts:read']));
    expect(view).toMatchObject({ crm_send_scope: false, crm_webhook_secret: false, errors: [] });
  });

  it('a refused key: one crm_me error tagged credential crm, scope unknown', async () => {
    crmLine();
    const { view } = await check(crmFailure(401, 'unauthorized'));
    expect(view?.crm_send_scope).toBeNull();
    expect(view?.errors).toEqual([expect.objectContaining({ step: 'crm_me', credential: 'crm' })]);
  });

  it('unconfigured: names the missing keys, no call', async () => {
    vi.stubEnv('WA_PROVIDER', 'crm');
    vi.stubEnv('WACRM_API_BASE', '');
    vi.stubEnv('WACRM_API_KEY', '');
    const { view, requests } = await check();
    expect(view).toMatchObject({ configured: false, provider: 'crm', gaps: ['WACRM_API_BASE', 'WACRM_API_KEY'] });
    expect(requests).toHaveLength(0);
  });
});
