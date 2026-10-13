import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { endSession, SIGN_OUT_TIMEOUT_MS } from './end-session';

const KEY = 'sb-test-auth-token';
const auth = vi.hoisted(() => ({
  signOut: vi.fn(),
  storageKey: 'sb-test-auth-token' as string | undefined,
  admin: { signOut: vi.fn() },
}));
vi.mock('@/lib/supabase', () => ({ supabase: { auth } }));

const never = () => new Promise(() => undefined);
const inSeconds = (s: number) => Math.floor(Date.now() / 1000) + s;

function stored(expiresAt: number): void {
  localStorage.setItem(KEY, JSON.stringify({ access_token: 'access-A', refresh_token: 'r', expires_at: expiresAt }));
  localStorage.setItem(`${KEY}-user`, '{"user":{}}');
}

beforeEach(() => {
  vi.resetAllMocks();
  auth.storageKey = KEY;
  auth.signOut.mockResolvedValue({ error: null });
  auth.admin.signOut.mockResolvedValue({ data: null, error: null });
  localStorage.setItem('ab.locale', 'ar');
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe('endSession always clears this browser’s session', () => {
  it('a valid token is revoked by itself, then the session is removed and signed out locally', async () => {
    stored(inSeconds(3600));
    await endSession();
    expect(auth.admin.signOut).toHaveBeenCalledExactlyOnceWith('access-A');
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(localStorage.getItem(`${KEY}-user`)).toBeNull();
    expect(localStorage.getItem('ab.locale')).toBe('ar');
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('expired token (offline): no request at all; the session is removed and signed out locally', async () => {
    stored(inSeconds(-60));
    await endSession();
    expect(auth.admin.signOut).not.toHaveBeenCalled();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('a revoke that answers { error } or throws still ends the session', async () => {
    stored(inSeconds(3600));
    auth.admin.signOut.mockResolvedValueOnce({ data: null, error: new Error('Failed to fetch') });
    await endSession();
    expect(localStorage.getItem(KEY)).toBeNull();
    stored(inSeconds(3600));
    auth.admin.signOut.mockRejectedValueOnce(new Error('boom'));
    await endSession();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(auth.signOut).toHaveBeenCalledTimes(2);
  });

  it('a hanging revoke is left behind after the timeout, then the session is removed', async () => {
    vi.useFakeTimers();
    stored(inSeconds(3600));
    auth.admin.signOut.mockImplementation(never);
    let done = false;
    const run = endSession().then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(SIGN_OUT_TIMEOUT_MS - 1);
    expect(done).toBe(false);
    expect(localStorage.getItem(KEY)).not.toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    await run;
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('never waits longer than two timeouts, even when every call hangs or throws', async () => {
    vi.useFakeTimers();
    stored(inSeconds(3600));
    auth.admin.signOut.mockImplementation(never);
    auth.signOut.mockImplementation(never);
    let done = false;
    const run = endSession().then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(2 * SIGN_OUT_TIMEOUT_MS);
    await run;
    expect(done).toBe(true);
    expect(localStorage.getItem(KEY)).toBeNull();
    auth.signOut.mockRejectedValueOnce(new Error('lock'));
    await expect(endSession()).resolves.toBeUndefined();
  });

  it('without a readable storage key it can only ask supabase, once', async () => {
    auth.storageKey = undefined;
    stored(inSeconds(3600));
    await endSession();
    expect(auth.admin.signOut).not.toHaveBeenCalled();
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(KEY)).not.toBeNull();
  });
});
