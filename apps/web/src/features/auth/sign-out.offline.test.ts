import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SIGN_OUT_TIMEOUT_MS } from './end-session';
import { signOut } from './sign-in';

const KEY = 'sb-test-auth-token';
const auth = vi.hoisted(() => ({ signInWithPassword: vi.fn(), signOut: vi.fn(), getSession: vi.fn(), storageKey: 'sb-test-auth-token' }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth } }));
vi.mock('./session-activity', () => ({ reportSession: vi.fn(async () => undefined) }));
vi.mock('@/features/notifications/web-push', () => ({ forgetWebPush: vi.fn(async () => undefined) }));

function signedIn(): QueryClient {
  localStorage.setItem(KEY, '{"access_token":"expired"}');
  const queryClient = new QueryClient();
  queryClient.setQueryData(['auth', 'me'], { id: 'u1', role: 'admin', permissions: [] });
  return queryClient;
}

afterEach(() => {
  vi.useRealTimers();
  auth.signOut.mockReset();
  localStorage.clear();
});

describe('«تسجيل الخروج» with an expired token offline', () => {
  it('supabase answers { error }: the stored session and the cache are still cleared', async () => {
    const queryClient = signedIn();
    auth.signOut.mockResolvedValueOnce({ error: new Error('Failed to fetch') }).mockResolvedValueOnce({ error: null });
    await signOut(queryClient);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(queryClient.getQueryData(['auth', 'me'])).toBeUndefined();
    expect(auth.signOut).toHaveBeenCalledTimes(2);
  });

  it('supabase never answers: signOut still finishes and clears the session', async () => {
    vi.useFakeTimers();
    const queryClient = signedIn();
    auth.signOut.mockImplementation(() => new Promise(() => undefined));
    let done = false;
    const run = signOut(queryClient).then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(2 * SIGN_OUT_TIMEOUT_MS);
    await run;
    expect(done).toBe(true);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(queryClient.getQueryData(['auth', 'me'])).toBeUndefined();
  });
});
