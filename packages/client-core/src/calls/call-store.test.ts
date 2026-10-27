import type { ActiveCallView } from '@ab/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MicError, type CallPeer } from './call-peer.js';
import type { CallPlatform } from './call-platform.js';
import { CallStore } from './call-store.js';
import type { CallsText } from './call-words.js';

const text = {
  mic: { denied: 'denied', unsupported: 'unsupported' },
  errors: { no_permission: 'no permission', call_failed: 'failed', media_failed: 'media' },
} as unknown as CallsText;

function fakePeer() {
  return {
    offer: vi.fn(async () => 'v=0 ours'),
    answer: vi.fn(async () => 'v=0 answer'),
    applyAnswer: vi.fn(async () => undefined),
    setMuted: vi.fn(),
    onFailed: vi.fn(),
    close: vi.fn(),
  } satisfies CallPeer;
}

function setup() {
  const sends = {
    startCall: vi.fn(async () => ({ id: 'c1' }) as ActiveCallView),
    acceptCall: vi.fn(async () => ({}) as ActiveCallView),
    rejectCall: vi.fn(async () => ({}) as ActiveCallView),
    endCall: vi.fn(async () => ({}) as ActiveCallView),
  };
  const audio = { route: vi.fn(async () => undefined), restore: vi.fn(async () => undefined) };
  const platform: CallPlatform = { sends, requestId: () => 'r1', text: () => text, audio };
  const peer = fakePeer();
  const store = new CallStore(platform, vi.fn());
  store.configure(async () => peer, []);
  return { store, sends, audio, peer };
}

const target = { phone: '+966501234567', name: 'أم سهيلة' };
const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => vi.useRealTimers());

describe('CallStore (the shared call steps, behind fakes)', () => {
  it('outbound: our offer goes to POST /calls once; «إنهاء» releases the mic, restores the audio and ends it', async () => {
    const { store, sends, audio, peer } = setup();
    store.begin(target);
    await flush();
    expect(sends.startCall).toHaveBeenCalledWith({ phone: target.phone, sdp: 'v=0 ours', clientRequestId: 'r1' });
    expect(store.get().session?.id).toBe('c1');
    expect(audio.route).toHaveBeenCalledWith(false);
    store.hangup();
    await flush();
    expect(peer.close).toHaveBeenCalled();
    expect(audio.restore).toHaveBeenCalled();
    expect(sends.endCall).toHaveBeenCalledWith('c1');
    expect(store.get().session).toBeNull();
  });

  it('a microphone refused for good says so with «افتح الإعدادات»; no WebRTC says unsupported', async () => {
    const { store, sends } = setup();
    store.configure(async () => Promise.reject(new MicError('blocked')), []);
    store.begin(target);
    await flush();
    expect(store.get()).toMatchObject({ session: null, notice: 'denied', noticeAction: 'settings' });
    store.configure(null, []);
    store.begin(target);
    await flush();
    expect(store.get()).toMatchObject({ notice: 'unsupported', noticeAction: null });
    expect(sends.startCall).not.toHaveBeenCalled();
  });

  it('follow: the answer applied once, the server ending it, the 45 s timer', async () => {
    vi.useFakeTimers();
    const { store, sends, peer } = setup();
    store.begin(target);
    await vi.advanceTimersByTimeAsync(0);
    store.follow({ answer: 'v=0 a', gone: false, deadline: Date.now() + 1_000, off: false });
    store.follow({ answer: 'v=0 a', gone: false, deadline: Date.now() + 1_000, off: false });
    expect(peer.applyAnswer).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(sends.endCall).toHaveBeenCalledWith('c1');
    expect(store.get().session).toBeNull();
  });

  it('calls switched off during a call: ended, the mic released', async () => {
    const { store, sends, peer } = setup();
    store.begin(target);
    await flush();
    store.follow({ answer: null, gone: false, deadline: null, off: true });
    await flush();
    expect(peer.close).toHaveBeenCalled();
    expect(sends.endCall).toHaveBeenCalledWith('c1');
    expect(store.get().session).toBeNull();
  });

  it('gone: the call ends here too, says «انتهت» a moment, then closes', async () => {
    vi.useFakeTimers();
    const { store, peer } = setup();
    store.begin(target);
    await vi.advanceTimersByTimeAsync(0);
    store.follow({ answer: null, gone: true, deadline: null, off: false });
    expect(peer.close).toHaveBeenCalled();
    expect(store.get().session?.ended).toBe(true);
    await vi.advanceTimersByTimeAsync(1_500);
    expect(store.get().session).toBeNull();
  });

  it('dispose (sign-out, calls off) ends a live call on WhatsApp too; reject stops the ring at once', async () => {
    const { store, sends } = setup();
    store.reject({ id: 'in1' } as ActiveCallView);
    expect(store.get().dismissed.has('in1')).toBe(true);
    expect(sends.rejectCall).toHaveBeenCalledWith('in1');
    store.begin(target);
    await flush();
    store.dispose();
    expect(sends.endCall).toHaveBeenCalledWith('c1');
  });
});
