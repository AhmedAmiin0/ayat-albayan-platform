import { describe, expect, it, vi } from 'vitest';
import type { GoogleData } from './google-data';
import { GoogleApiError, type GoogleClientFactory, type GoogleOAuth } from './google-client.port';
import { fakeFactory } from './google-client.fake';
import { GoogleConnection } from './google-connection';
import { GoogleOAuthService, REQUIRED_SCOPES } from './google-oauth.service';
import type { GoogleRuntime } from './google-runtime';
import { fakeData } from './google-sync.fakes';
import { nonceHash } from './oauth-state';
import type { GoogleAccountQueries } from './google-account.queries';
import type { GoogleAlerts } from './google-alerts';

function setup(exchange = vi.fn().mockResolvedValue({ refreshToken: 'fake-refresh', scopes: [...REQUIRED_SCOPES, 'openid'], accessToken: 'fake-access' })) {
  const data = fakeData();
  let stored = '';
  data.account.setNonce.mockImplementation(async ({ hash }: { hash: string }) => void (stored = hash));
  data.account.consumeNonce.mockImplementation(async (h: string) => {
    const ok = h === stored;
    stored = '';
    return ok;
  });
  const oauth: GoogleOAuth = { authUrl: vi.fn(({ state }) => `https://stub.test/auth?state=${encodeURIComponent(state)}`), exchange, email: vi.fn().mockResolvedValue('academy@example.test'), revoke: vi.fn() };
  const factory: GoogleClientFactory = fakeFactory(undefined, oauth);
  const connection = new GoogleConnection(data.account as unknown as GoogleAccountQueries, factory, { disconnected: vi.fn() } as unknown as GoogleAlerts);
  const audit = { record: vi.fn() };
  const svc = new GoogleOAuthService(data as unknown as GoogleData, factory, { connection, audit } as unknown as GoogleRuntime);
  return { svc, data, oauth, audit };
}
const stateOf = (url: string) => decodeURIComponent(url.split('state=')[1] ?? '');

describe('GoogleOAuthService', () => {
  it('connect → callback stores the refresh token in Vault and marks the account connected', async () => {
    const s = setup();
    const state = stateOf(await s.svc.connectUrl('admin-1'));
    expect(s.data.account.setNonce).toHaveBeenCalledWith(expect.objectContaining({ hash: expect.stringMatching(/^[0-9a-f]{64}$/) }));
    expect(await s.svc.callback({ code: 'code-1', state })).toBe('connected');
    expect(s.data.account.setToken).toHaveBeenCalledWith('fake-refresh');
    expect(s.data.account.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'connected', email: 'academy@example.test', connected_by: 'admin-1' }));
    expect(JSON.stringify(s.audit.record.mock.calls)).not.toContain('fake-refresh');
  });

  it('a state works once (CSRF / replay), and a forged one never', async () => {
    const s = setup();
    const state = stateOf(await s.svc.connectUrl('admin-1'));
    expect(await s.svc.callback({ code: 'c', state })).toBe('connected');
    expect(await s.svc.callback({ code: 'c', state })).toBe('state');
    expect(await s.svc.callback({ code: 'c', state: `${state}x` })).toBe('state');
    expect(await s.svc.callback({ code: 'c' })).toBe('state');
    expect(s.data.account.setToken).toHaveBeenCalledTimes(1);
  });

  it('denied consent, a failed exchange, no refresh token or missing scopes never connect', async () => {
    expect(await setup().svc.callback({ error: 'access_denied', state: 'x' })).toBe('denied');
    const failing = setup(vi.fn().mockRejectedValue(new GoogleApiError(400, 'invalid_grant')));
    expect(await failing.svc.callback({ code: 'c', state: stateOf(await failing.svc.connectUrl('a')) })).toBe('exchange');
    const noRefresh = setup(vi.fn().mockResolvedValue({ refreshToken: null, scopes: [...REQUIRED_SCOPES], accessToken: 'x' }));
    expect(await noRefresh.svc.callback({ code: 'c', state: stateOf(await noRefresh.svc.connectUrl('a')) })).toBe('exchange');
    const narrow = setup(vi.fn().mockResolvedValue({ refreshToken: 'r', scopes: ['openid'], accessToken: 'x' }));
    expect(await narrow.svc.callback({ code: 'c', state: stateOf(await narrow.svc.connectUrl('a')) })).toBe('scopes');
    expect(narrow.data.account.setToken).not.toHaveBeenCalled();
  });

  it('refuses another Google account than the academy one already connected', async () => {
    const s = setup();
    s.data.account.get.mockResolvedValue({ email: 'other@example.test' });
    expect(await s.svc.callback({ code: 'c', state: stateOf(await s.svc.connectUrl('admin-1')) })).toBe('account');
    expect(s.data.account.setToken).not.toHaveBeenCalled();
    expect(s.oauth.revoke).toHaveBeenCalledWith('fake-refresh');
  });

  it('refuses a grant whose account email cannot be read (the switch check would be blind after it)', async () => {
    const s = setup();
    vi.mocked(s.oauth.email).mockResolvedValue(null);
    expect(await s.svc.callback({ code: 'c', state: stateOf(await s.svc.connectUrl('admin-1')) })).toBe('account');
    expect(s.data.account.setToken).not.toHaveBeenCalled();
    expect(s.oauth.revoke).toHaveBeenCalledWith('fake-refresh');
  });

  it('disconnect revokes, clears the Vault token and marks disconnected', async () => {
    const s = setup();
    s.data.account.token.mockResolvedValue('fake-refresh');
    await s.svc.disconnect('admin-1');
    expect(s.oauth.revoke).toHaveBeenCalledWith('fake-refresh');
    expect(s.data.account.clearToken).toHaveBeenCalled();
    expect(s.data.account.update).toHaveBeenCalledWith({ status: 'disconnected', last_error: null });
  });

  it('stores only the nonce hash', async () => {
    const s = setup();
    const state = stateOf(await s.svc.connectUrl('admin-1'));
    const payload = JSON.parse(Buffer.from(state.split('.')[0] ?? '', 'base64url').toString()) as { n: string };
    expect(s.data.account.setNonce).toHaveBeenCalledWith(expect.objectContaining({ hash: nonceHash(payload.n) }));
  });
});
