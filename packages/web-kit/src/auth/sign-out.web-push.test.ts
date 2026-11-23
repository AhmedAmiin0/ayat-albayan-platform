import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signIn, signOut } from '#/auth/sign-in/index.ts';

const order = vi.hoisted(() => [] as string[]);
const auth = vi.hoisted(() => ({
  signOut: vi.fn(async () => void order.push('signOut')),
  signInWithPassword: vi.fn(async () => {
    order.push('signInWithPassword');
    return { error: new Error('Invalid login') };
  }),
}));
vi.mock('#/lib/http/supabase.ts', () => ({ supabase: { auth } }));
vi.mock('#/auth/session-activity.ts', () => ({ reportSession: vi.fn(async () => void order.push('report')) }));
vi.mock('#/push/web-push.ts', () => ({ forgetWebPush: vi.fn(async () => void order.push('forget')) }));

beforeEach(() => {
  order.length = 0;
});

describe('signOut drops this browser’s push subscription', () => {
  it('forgets it while the token is still valid, before signing out', async () => {
    await signOut(new QueryClient());
    expect(order).toContain('forget');
    expect(order.at(-1)).toBe('signOut');
  });
});

describe('signIn never inherits the previous user’s browser push', () => {
  it('forgets the leftover subscription before signing in', async () => {
    await signIn({ email: 'a@example.com', password: 'x' }, new QueryClient());
    expect(order.slice(0, 2)).toEqual(['forget', 'signInWithPassword']);
  });
});
