import { ApiError } from '@ab/client-core';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { signIn, signInWithCode } from './sign-in';

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  setSession: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
}));
const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());

vi.mock('@/lib/http/supabase', () => ({ supabase: { auth } }));
vi.mock('@/lib/http/api', () => ({ apiFetch, apiSend }));
vi.mock('./session-activity', () => ({ reportSession: vi.fn() }));

const session = { access_token: 'at', refresh_token: 'rt', expires_in: 3600, expires_at: null };

// docs/30 §5: every way of signing in ends with the same «who am I» landing.
describe('signIn by identifier', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    auth.getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
    apiFetch.mockResolvedValue({ id: 'u1', role: 'teacher' });
  });

  it('an email signs in with GoTrue directly', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    await expect(signIn({ email: ' a@b.co ', password: 'pw' }, new QueryClient())).resolves.toEqual({ ok: true, home: '/teacher' });
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.co', password: 'pw' });
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('a username goes through POST /auth/login, then setSession', async () => {
    apiSend.mockResolvedValue(session);
    auth.setSession.mockResolvedValue({ error: null });
    await expect(signIn({ email: 'AB-1234', password: 'pw' }, new QueryClient())).resolves.toEqual({ ok: true, home: '/teacher' });
    expect(apiSend).toHaveBeenCalledWith('POST', '/auth/login', { username: 'AB-1234', password: 'pw' });
    expect(auth.setSession).toHaveBeenCalledWith({ access_token: 'at', refresh_token: 'rt' });
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('a wrong username or password says so', async () => {
    apiSend.mockRejectedValue(new ApiError(401, { code: 'invalid_credentials' }));
    const result = await signIn({ email: 'sara', password: 'x' }, new QueryClient());
    expect(result).toEqual({ ok: false, error: t.auth.invalidCredentials });
    expect(auth.setSession).not.toHaveBeenCalled();
  });

  it('too many attempts shows the rate-limit text', async () => {
    apiSend.mockRejectedValue(new ApiError(429, { code: 'too_many_requests' }));
    const result = await signIn({ email: 'sara', password: 'x' }, new QueryClient());
    expect(result).toEqual({ ok: false, error: t.familyAuth.errors.too_many_requests });
  });
});

describe('signInWithCode', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    auth.getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
    apiFetch.mockResolvedValue({ id: 'g1', role: 'guardian' });
  });

  it('verifies the code, then verifyOtp with the token hash', async () => {
    apiSend.mockResolvedValue({ token_hash: 'hash', type: 'magiclink' });
    auth.verifyOtp.mockResolvedValue({ error: null });
    const result = await signInWithCode({ phone: '+201001234567', code: '123456' }, new QueryClient());
    expect(apiSend).toHaveBeenCalledWith('POST', '/auth/code/verify', { phone: '+201001234567', code: '123456' });
    expect(auth.verifyOtp).toHaveBeenCalledWith({ type: 'magiclink', token_hash: 'hash' });
    expect(result.ok).toBe(true);
  });

  it('a wrong code, a staff phone or a disabled account never reach verifyOtp', async () => {
    const cases: [ApiError, string][] = [
      [new ApiError(401, { code: 'invalid_code' }), t.familyAuth.errors.invalid_code],
      [new ApiError(409, { code: 'phone_belongs_to_staff' }), t.familyAuth.errors.phone_belongs_to_staff],
      [new ApiError(403, { code: 'account_disabled' }), t.users.errors.account_disabled],
    ];
    for (const [error, text] of cases) {
      apiSend.mockRejectedValueOnce(error);
      await expect(signInWithCode({ phone: '+1', code: '1' }, new QueryClient())).resolves.toEqual({ ok: false, error: text });
    }
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it('a refused token hash reads as an invalid code', async () => {
    apiSend.mockResolvedValue({ token_hash: 'hash', type: 'magiclink' });
    auth.verifyOtp.mockResolvedValue({ error: new Error('expired') });
    const result = await signInWithCode({ phone: '+1', code: '1' }, new QueryClient());
    expect(result).toEqual({ ok: false, error: t.familyAuth.errors.invalid_code });
  });
});
