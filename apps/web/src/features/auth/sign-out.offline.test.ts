import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SIGN_OUT_TIMEOUT_MS } from './end-session';
import { signOut } from './sign-in';

const KEY = 'sb-test-auth-token';
const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  storageKey: 'sb-test-auth-token',
  admin: { signOut: vi.fn() },
}));
vi.mock('@/lib/supabase', () => ({ supabase: { auth } }));
vi.mock('./session-activity', () => ({ reportSession: vi.fn(async () => undefined) }));
vi.mock('@/features/notifications/web-push', () => ({ forgetWebPush: vi.fn(async () => undefined) }));

function signedIn(expiresInS: number): QueryClient {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInS;
  localStorage.setItem(KEY, JSON.stringify({ access_token: 'access-A', refresh_token: 'r', expires_at: expiresAt }));
  const queryClient = new QueryClient();
  queryClient.setQueryData(['auth', 'me'], { id: 'u1', role: 'admin', permissions: [] });
  return queryClient;
}

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
  localStorage.clear();
});

describe('«تسجيل الخروج» with an expired token offline', () => {
  it('nothing is sent (the token cannot be refreshed): the stored session and the cache are cleared', async () => {
    const queryClient = signedIn(-60);
    auth.signOut.mockResolvedValue({ error: null });
    await signOut(queryClient);
    expect(auth.admin.signOut).not.toHaveBeenCalled();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(queryClient.getQueryData(['auth', 'me'])).toBeUndefined();
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('the network never answers: signOut still finishes and clears the session', async () => {
    vi.useFakeTimers();
    const queryClient = signedIn(3600);
    auth.admin.signOut.mockImplementation(() => new Promise(() => undefined));
    auth.signOut.mockImplementation(() => new Promise(() => undefined));
    let done = false;
    const run = signOut(queryClient).then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(2 * SIGN_OUT_TIMEOUT_MS);
    await run;
    expect(done).toBe(true);
    expect(auth.admin.signOut).toHaveBeenCalledWith('access-A');
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(queryClient.getQueryData(['auth', 'me'])).toBeUndefined();
  });
});
