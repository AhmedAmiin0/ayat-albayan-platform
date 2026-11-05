import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { STUB_ENV, type Recorded } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { LINES_RECORDED as R, routedFetch, stubEnvs, TWO_LINES_ENV } from '@/modules/messaging/whatsapp/whatsapp.lines.fakes';
import { LinesCheck } from './lines.check';
import { appSubscribed } from './lines.check.meta';

// docs/19 «CRM → Meta»: «افحص الخطوط» says whether the app secret and the verify token are set
// (booleans, never values) and whether the line's app is subscribed to its WABA, before and after
// the switch.

const NW = `${STUB_ENV.wabaId}/subscribed_apps`;
const CRM = { WA_PROVIDER: 'crm', WACRM_API_BASE: 'http://127.0.0.1:4010/crm/api/v1', WACRM_API_KEY: 'fake-crm-key' };
const ME = { status: 200, body: { data: { account: { id: 'a', name: 'Academy' }, key: { id: 'k', scopes: ['messages:send'] } } } };
const ONLY_NOTIFICATIONS = { WA_CHAT_PHONE_NUMBER_ID: '', WA_CHAT_WABA_ID: '', WA_CHAT_ACCESS_TOKEN: '', WA_CHAT_APP_ID: '' };

async function notifications(routes: Record<string, Recorded | Error>) {
  const f = routedFetch(routes);
  const lines = new LinesCheck();
  lines.fetch = f.fetch;
  const [view] = await lines.check();
  return { view, requests: f.requests };
}

beforeEach(() => stubEnvs({ ...TWO_LINES_ENV, ...ONLY_NOTIFICATIONS }));
afterEach(() => stubEnvs(null));

describe('meta_ready on a meta line', () => {
  it('secret set, verify token set, our app subscribed; no value in the view', async () => {
    stubEnvs({ ...TWO_LINES_ENV, ...ONLY_NOTIFICATIONS, WA_VERIFY_TOKEN: 'fake-verify' });
    const { view } = await notifications({ [STUB_ENV.phoneNumberId]: R.phone, [NW]: R.subscribed });
    const all = { app_secret: true, verify_token: true, app_subscribed: true };
    expect(view?.meta_ready).toEqual(all);
    expect(JSON.stringify(view)).not.toMatch(/fake-verify|notifications-secret/);
  });

  it('no app subscribed, the secret unset', async () => {
    stubEnvs({ ...TWO_LINES_ENV, ...ONLY_NOTIFICATIONS, WA_APP_SECRET: '' });
    const routes = { [STUB_ENV.phoneNumberId]: R.phone, [NW]: R.noneSubscribed };
    const { view } = await notifications(routes);
    const none = { app_secret: false, verify_token: false, app_subscribed: false };
    expect(view?.meta_ready).toEqual(none);
  });
});

describe('meta_ready on a crm line (the switch preflight)', () => {
  it('the CRM\'s GET /me plus ONE read-only Graph GET of the WABA\'s subscribed apps', async () => {
    stubEnvs({ ...TWO_LINES_ENV, ...ONLY_NOTIFICATIONS, ...CRM, WA_VERIFY_TOKEN: 'v' });
    const { view, requests } = await notifications({ 'http://127.0.0.1:4010/crm/api/v1/me': ME, [NW]: R.subscribed });
    expect(view).toMatchObject({ provider: 'crm', meta_ready: { app_secret: true, verify_token: true, app_subscribed: true } });
    expect(requests.map((r) => r.init.method ?? 'GET')).toEqual(['GET', 'GET']);
  });

  it('no Meta ids yet, or the call failed: not known (null), the booleans still shown', async () => {
    stubEnvs({ ...TWO_LINES_ENV, ...ONLY_NOTIFICATIONS, ...CRM, WA_WABA_ID: '' });
    expect((await notifications({ 'http://127.0.0.1:4010/crm/api/v1/me': ME })).view?.meta_ready?.app_subscribed).toBeNull();
    stubEnvs({ ...TWO_LINES_ENV, ...ONLY_NOTIFICATIONS, ...CRM });
    const failed = await notifications({ 'http://127.0.0.1:4010/crm/api/v1/me': ME, [NW]: R.badToken });
    const unknown = { app_secret: true, verify_token: false, app_subscribed: null };
    expect(failed.view?.meta_ready).toEqual(unknown);
  });
});

describe('appSubscribed', () => {
  it('by the app id; without one any app; unknown stays null', () => {
    const apps = [{ id: 'a1', name: null, override_callback_uri: null }];
    expect(appSubscribed(apps, 'a1')).toBe(true);
    expect(appSubscribed(apps, 'a2')).toBe(false);
    expect(appSubscribed(apps, null)).toBe(true);
    expect(appSubscribed([], null)).toBe(false);
    expect(appSubscribed(null, 'a1')).toBeNull();
  });
});
