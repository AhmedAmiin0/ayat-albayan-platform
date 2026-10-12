import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { signOut } from './sign-in';

const order = vi.hoisted(() => [] as string[]);
const auth = vi.hoisted(() => ({ signOut: vi.fn(async () => void order.push('signOut')) }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth } }));
vi.mock('./session-activity', () => ({ reportSession: vi.fn(async () => void order.push('report')) }));
vi.mock('@/features/notifications/web-push', () => ({ forgetWebPush: vi.fn(async () => void order.push('forget')) }));

describe('signOut drops this browser’s push subscription', () => {
  it('forgets it while the token is still valid, before signing out', async () => {
    await signOut(new QueryClient());
    expect(order).toContain('forget');
    expect(order.at(-1)).toBe('signOut');
  });
});
