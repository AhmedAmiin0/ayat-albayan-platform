import type { AuthChangeEvent } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { getDraft, setDraft } from '@/features/inbox/draft-store';
import { lastOwnSend, recordOwnSend } from '@/features/inbox/own-send';
import { registerDrafts, type RegisterDraft } from '@/features/inbox/register-drafts';
import { bindWebPushToSession } from './web-push-session';

const dropLocalWebPush = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('./web-push', () => ({ dropLocalWebPush }));

const PHONE = '+966501234567';

function fakeAuth() {
  let listener: ((event: AuthChangeEvent) => void) | undefined;
  const unsubscribe = vi.fn();
  const onAuthStateChange = vi.fn((fn: (event: AuthChangeEvent) => void) => {
    listener = fn;
    return { data: { subscription: { id: 'l1', callback: vi.fn(), unsubscribe } } };
  });
  return { auth: { onAuthStateChange }, emit: (e: AuthChangeEvent) => listener?.(e), unsubscribe };
}

describe('bindWebPushToSession (R-NOT-02 privacy)', () => {
  it('unsubscribes this browser on SIGNED_OUT only', () => {
    const { auth, emit } = fakeAuth();
    bindWebPushToSession(auth as never);
    emit('SIGNED_IN');
    emit('TOKEN_REFRESHED');
    expect(dropLocalWebPush).not.toHaveBeenCalled();
    emit('SIGNED_OUT');
    expect(dropLocalWebPush).toHaveBeenCalledTimes(1);
  });

  it('returns the listener’s unsubscribe', () => {
    const { auth, unsubscribe } = fakeAuth();
    bindWebPushToSession(auth as never)();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('SIGNED_OUT from anywhere (an account disabled mid-session) forgets the inbox tab memories (round 2 D)', () => {
    const { auth, emit } = fakeAuth();
    bindWebPushToSession(auth as never);
    setDraft(PHONE, { text: 'مسودة', failed: null });
    recordOwnSend(PHONE, 'm-1');
    registerDrafts.set(PHONE, {} as RegisterDraft);
    emit('TOKEN_REFRESHED');
    expect(getDraft(PHONE).text).toBe('مسودة');
    emit('SIGNED_OUT');
    expect(getDraft(PHONE).text).toBe('');
    expect(lastOwnSend(PHONE)).toBeUndefined();
    expect(registerDrafts.get(PHONE)).toBeUndefined();
  });
});
