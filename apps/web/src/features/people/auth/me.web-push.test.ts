import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signIn } from './sign-in';

const order = vi.hoisted(() => [] as string[]);
const auth = vi.hoisted(() => ({
  signOut: vi.fn(async () => void order.push('signOut')),
  signInWithPassword: vi.fn(async () => ({ error: null })),
  getSession: vi.fn(async () => ({ data: { session: { access_token: 'tok' } } })),
}));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/supabase', () => ({ supabase: { auth } }));
vi.mock('@/lib/http/api', () => ({ apiFetch }));
vi.mock('./session-activity', () => ({ reportSession: vi.fn(async () => undefined) }));
vi.mock('@/features/messaging/notifications/web-push/web-push', () => ({
  forgetWebPush: vi.fn(async () => void order.push('forget')),
}));

const creds = { email: 'a@example.com', password: 'x' };

beforeEach(() => {
  order.length = 0;
});

describe('the forced sign-outs drop this browser’s push subscription first', () => {
  it('account_disabled (403): forget, then sign out', async () => {
    apiFetch.mockRejectedValueOnce(
      Object.assign(new Error('API 403'), { status: 403, body: { code: 'account_disabled' } }),
    );
    await signIn(creds, new QueryClient());
    // The first forget is the sign-in's own (a leftover from the previous user).
    expect(order).toEqual(['forget', 'forget', 'signOut']);
  });

  it('a login without a role: forget, then sign out', async () => {
    apiFetch.mockResolvedValueOnce({ id: 'u1', email: creds.email, role: null });
    await signIn(creds, new QueryClient());
    expect(order).toEqual(['forget', 'forget', 'signOut']);
  });
});
