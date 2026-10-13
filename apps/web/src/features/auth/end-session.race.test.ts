import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/lib/supabase';
import { endSession, SIGN_OUT_TIMEOUT_MS } from './end-session';

/**
 * The real auth-js client (createClient over a fake network), so a sign-out call left behind at the
 * timeout is seen finishing later: whoever signs in next on this browser must stay signed in, and
 * their token must never reach /logout.
 */
const net = vi.hoisted(() => {
  const state = { online: true, hangLogout: false, calls: [] as string[], release: [] as (() => void)[] };
  const session = (name: string) => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const user = { id: `user-${name}`, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '' };
    const body = { access_token: `access-${name}`, refresh_token: `refresh-${name}`, token_type: 'bearer', expires_in: 3600, expires_at: expiresAt, user };
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    const bearer = new Headers(init?.headers).get('Authorization') ?? '-';
    state.calls.push(`${url.replace('http://sb.test/auth/v1', '')} ${bearer}`);
    if (!state.online) throw new TypeError('Failed to fetch');
    if (url.includes('/logout')) {
      if (!state.hangLogout) return new Response(null, { status: 204 });
      return new Promise((resolve) => state.release.push(() => resolve(new Response(null, { status: 204 }))));
    }
    if (url.includes('grant_type=password')) return session('B');
    if (url.includes('grant_type=refresh_token')) return session('A2');
    return new Response('{}', { status: 404 });
  };
  return { state, fetch };
});

vi.mock('@/lib/supabase', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const auth = { storageKey: 'sb-race-auth-token', autoRefreshToken: false, detectSessionInUrl: false };
  return { supabase: createClient('http://sb.test', 'anon', { auth, global: { fetch: net.fetch } }) };
});

const KEY = 'sb-race-auth-token';
const events: string[] = [];
supabase.auth.onAuthStateChange((event) => void events.push(event));

function storeSessionA(expiresInS: number): void {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInS;
  const user = { id: 'user-A', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '' };
  localStorage.setItem(KEY, JSON.stringify({ access_token: 'access-A', refresh_token: 'refresh-A', expires_in: 3600, expires_at: expiresAt, token_type: 'bearer', user }));
}

/** endSession, then the next person signs in, then the clock runs past every auth-js retry. */
async function signOutThenNextPersonSignsIn(goOnline: () => void): Promise<void> {
  const run = endSession();
  await vi.advanceTimersByTimeAsync(2 * SIGN_OUT_TIMEOUT_MS);
  await run;
  expect(localStorage.getItem(KEY)).toBeNull();
  expect(events).toContain('SIGNED_OUT');
  goOnline();
  const { error } = await supabase.auth.signInWithPassword({ email: 'b@ab.local', password: 'secret-123' });
  expect(error).toBeNull();
  await vi.advanceTimersByTimeAsync(60_000);
}

function storedAccessToken(): string | null {
  const raw = localStorage.getItem(KEY);
  return raw ? String(JSON.parse(raw).access_token) : null;
}

beforeEach(async () => {
  await supabase.auth.getSession(); // initialized on an empty storage
  Object.assign(net.state, { online: true, hangLogout: false, calls: [], release: [] });
  events.length = 0;
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe('a sign-out left behind never signs out the next person (real auth-js)', () => {
  it('expired token offline: no refresh is started, so a later sign-in survives', async () => {
    storeSessionA(-60);
    net.state.online = false;
    await signOutThenNextPersonSignsIn(() => {
      net.state.online = true;
    });
    expect(storedAccessToken()).toBe('access-B');
    expect(net.state.calls.filter((call) => call.includes('refresh_token'))).toEqual([]);
    expect(net.state.calls.filter((call) => call.includes('/logout'))).toEqual([]);
  });

  it('valid token, /logout hangs: when it finally answers, the next session is untouched', async () => {
    storeSessionA(3600);
    net.state.hangLogout = true;
    await signOutThenNextPersonSignsIn(() => undefined);
    for (const release of net.state.release) release();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(storedAccessToken()).toBe('access-B');
    expect(net.state.calls.filter((call) => call.includes('/logout'))).toEqual(['/logout?scope=global Bearer access-A']);
  });
});
