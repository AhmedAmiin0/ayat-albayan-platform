import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { signOut } from './sign-in';
import { REPORT_TIMEOUT_MS } from './session-activity';

const auth = vi.hoisted(() => ({ signInWithPassword: vi.fn(), signOut: vi.fn(), getSession: vi.fn() }));
const apiFetch = vi.hoisted(() => vi.fn());

vi.mock('@/lib/http/supabase', () => ({ supabase: { auth } }));
vi.mock('@/lib/http/api', () => ({ apiFetch }));

afterEach(() => {
  vi.useRealTimers();
});

describe('signOut never hangs on the activity report', () => {
  it('signs out within the timeout even when the report never answers', async () => {
    vi.useFakeTimers();
    apiFetch.mockImplementation(() => new Promise(() => undefined));
    auth.signOut.mockResolvedValue({ error: null });
    let done = false;
    const run = signOut(new QueryClient()).then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(REPORT_TIMEOUT_MS);
    await run;
    expect(done).toBe(true);
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('still signs out when the report fails', async () => {
    apiFetch.mockImplementation(() => Promise.reject(new Error('down')));
    auth.signOut.mockResolvedValue({ error: null });
    await signOut(new QueryClient());
    expect(auth.signOut).toHaveBeenCalled();
  });
});
