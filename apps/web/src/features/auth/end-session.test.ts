import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { endSession, SIGN_OUT_TIMEOUT_MS } from './end-session';

const KEY = 'sb-test-auth-token';
const auth = vi.hoisted(() => ({ signOut: vi.fn(), storageKey: 'sb-test-auth-token' }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth } }));

const never = () => new Promise(() => undefined);

beforeEach(() => {
  auth.signOut.mockReset();
  localStorage.setItem(KEY, '{"access_token":"expired"}');
  localStorage.setItem(`${KEY}-user`, '{"user":{}}');
  localStorage.setItem('ab.locale', 'ar');
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe('endSession always clears this browser’s session', () => {
  it('a clean sign-out is left to supabase (one call, nothing removed by hand)', async () => {
    auth.signOut.mockResolvedValue({ error: null });
    await endSession();
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(KEY)).not.toBeNull();
  });

  it('expired token offline: supabase answers { error } and keeps the session, so it is removed and signOut runs again', async () => {
    auth.signOut.mockResolvedValueOnce({ error: new Error('Failed to fetch') }).mockResolvedValueOnce({ error: null });
    await endSession();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(localStorage.getItem(`${KEY}-user`)).toBeNull();
    expect(localStorage.getItem('ab.locale')).toBe('ar');
    expect(auth.signOut).toHaveBeenCalledTimes(2);
  });

  it('a throwing signOut is treated like an error', async () => {
    auth.signOut.mockRejectedValueOnce(new Error('lock')).mockResolvedValueOnce({ error: null });
    await endSession();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(auth.signOut).toHaveBeenCalledTimes(2);
  });

  it('a hanging signOut is abandoned after the timeout, then the session is removed by hand', async () => {
    vi.useFakeTimers();
    auth.signOut.mockImplementationOnce(never).mockResolvedValueOnce({ error: null });
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
    expect(auth.signOut).toHaveBeenCalledTimes(2);
  });

  it('never waits longer than two timeouts, even when every call hangs', async () => {
    vi.useFakeTimers();
    auth.signOut.mockImplementation(never);
    let done = false;
    const run = endSession().then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(2 * SIGN_OUT_TIMEOUT_MS);
    await run;
    expect(done).toBe(true);
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});
