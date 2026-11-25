import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { onSessionEnd } from '@ab/web-kit/lib/session/session-end';
import { bindWebPushToSession } from './web-push-session';

const dropLocalWebPush = vi.hoisted(() => vi.fn(async () => undefined));
const rebindWebPush = vi.hoisted(() => vi.fn(async () => null));
vi.mock('./web-push', () => ({ dropLocalWebPush, rebindWebPush }));

const forgetMemories = vi.fn();
onSessionEnd(forgetMemories);

function fakeAuth() {
  let listener: ((event: AuthChangeEvent, session: Session | null) => void) | undefined;
  const unsubscribe = vi.fn();
  const onAuthStateChange = vi.fn((fn: (event: AuthChangeEvent, session: Session | null) => void) => {
    listener = fn;
    return { data: { subscription: { id: 'l1', callback: vi.fn(), unsubscribe } } };
  });
  const as = (user: string | null) => (user ? ({ user: { id: user } } as Session) : null);
  const emit = (e: AuthChangeEvent, user: string | null = e === 'SIGNED_OUT' ? null : 'u1') => listener?.(e, as(user));
  return { auth: { onAuthStateChange }, emit, unsubscribe };
}

describe('bindWebPushToSession (R-NOT-02 privacy)', () => {
  it('unsubscribes this browser on SIGNED_OUT only', () => {
    const { auth, emit } = fakeAuth();
    bindWebPushToSession(auth);
    emit('SIGNED_IN');
    emit('TOKEN_REFRESHED');
    expect(dropLocalWebPush).not.toHaveBeenCalled();
    emit('SIGNED_OUT');
    expect(dropLocalWebPush).toHaveBeenCalledTimes(1);
  });

  it('another person signing in on this browser without a sign-out drops the previous user’s subscription', () => {
    dropLocalWebPush.mockClear();
    const { auth, emit } = fakeAuth();
    bindWebPushToSession(auth);
    emit('INITIAL_SESSION', 'u1');
    emit('SIGNED_IN', 'u1'); // the same person again (a tab refocus): kept
    emit('TOKEN_REFRESHED', 'u1');
    expect(dropLocalWebPush).not.toHaveBeenCalled();
    emit('SIGNED_IN', 'u2');
    expect(dropLocalWebPush).toHaveBeenCalledTimes(1);
  });

  it('returns the listener’s unsubscribe', () => {
    const { auth, unsubscribe } = fakeAuth();
    bindWebPushToSession(auth)();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('SIGNED_OUT from anywhere (an account disabled mid-session) forgets the tab memories (round 2 D)', () => {
    const { auth, emit } = fakeAuth();
    bindWebPushToSession(auth);
    forgetMemories.mockClear();
    emit('TOKEN_REFRESHED');
    expect(forgetMemories).not.toHaveBeenCalled();
    emit('SIGNED_OUT');
    expect(forgetMemories).toHaveBeenCalledTimes(1);
  });

  it('on load, a signed-in browser re-binds its subscription to this session (bell never opened)', async () => {
    await new Promise((resolve) => setTimeout(resolve, 0)); // earlier tests' deferred re-binds
    vi.useFakeTimers();
    rebindWebPush.mockClear();
    const { auth, emit } = fakeAuth();
    bindWebPushToSession(auth);
    emit('INITIAL_SESSION', null);
    emit('TOKEN_REFRESHED');
    await vi.runAllTimersAsync();
    expect(rebindWebPush).not.toHaveBeenCalled();
    emit('INITIAL_SESSION', 'u1');
    await vi.runAllTimersAsync();
    expect(rebindWebPush).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
