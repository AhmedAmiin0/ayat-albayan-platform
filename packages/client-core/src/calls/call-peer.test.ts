import { afterEach, describe, expect, it, vi } from 'vitest';
import { callPeer, gathered, type PeerLike, type StreamLike } from './call-peer.js';

function fakeMic() {
  const track = { enabled: true, stop: vi.fn() };
  const release = vi.fn();
  const mic: StreamLike = { getAudioTracks: () => [track], getTracks: () => [track], release };
  return { track, mic, release };
}

function fakePeer() {
  const listeners = new Map<string, () => void>();
  const remote: unknown[] = [];
  const pc = {
    iceGatheringState: 'complete',
    connectionState: 'new',
    localDescription: null as { sdp: string } | null,
    remoteDescription: null as unknown,
    remote,
    listeners,
    createOffer: vi.fn(async () => ({ type: 'offer' as const, sdp: 'v=0 offer' })),
    createAnswer: vi.fn(async () => ({ type: 'answer' as const, sdp: 'v=0 answer' })),
    setLocalDescription: vi.fn(async (d: unknown) => void (pc.localDescription = d as { sdp: string })),
    setRemoteDescription: vi.fn(async (d: unknown) => void (remote.push(d), (pc.remoteDescription = d))),
    addEventListener: (type: string, l: () => void) => void listeners.set(type, l),
    removeEventListener: vi.fn(),
    close: vi.fn(),
  };
  return pc satisfies PeerLike;
}

afterEach(() => vi.useRealTimers());

describe('callPeer (the SDP steps, behind fakes)', () => {
  it("outbound: the gathered offer; WhatsApp's answer applied once; mute toggles the track", async () => {
    const pc = fakePeer();
    const { mic, track, release } = fakeMic();
    const peer = callPeer(pc, mic);
    await expect(peer.offer()).resolves.toBe('v=0 offer');
    await peer.applyAnswer('v=0 a');
    await peer.applyAnswer('v=0 b');
    expect(pc.remote).toEqual([{ type: 'answer', sdp: 'v=0 a' }]);
    peer.setMuted(true);
    expect(track.enabled).toBe(false);
    peer.close();
    // The microphone is released (react-native-webrtc keeps the native stream until release()).
    expect(track.stop).toHaveBeenCalled();
    expect(release).toHaveBeenCalled();
    expect(pc.close).toHaveBeenCalled();
  });

  it("inbound: the answer to the family's offer", async () => {
    const pc = fakePeer();
    const peer = callPeer(pc, fakeMic().mic);
    await expect(peer.answer('v=0 their offer')).resolves.toBe('v=0 answer');
    expect(pc.remote).toEqual([{ type: 'offer', sdp: 'v=0 their offer' }]);
  });

  it('onFailed fires when the media drops for good', () => {
    const pc = fakePeer();
    const failed = vi.fn();
    callPeer(pc, fakeMic().mic).onFailed(failed);
    pc.connectionState = 'failed';
    pc.listeners.get('connectionstatechange')?.();
    expect(failed).toHaveBeenCalled();
  });
});

describe('gathered', () => {
  it('waits for complete, or gives up after the cap', async () => {
    vi.useFakeTimers();
    const pc = { ...fakePeer(), iceGatheringState: 'gathering' };
    const done = vi.fn();
    void gathered(pc, 3000).then(done);
    await vi.advanceTimersByTimeAsync(2999);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toHaveBeenCalled();
  });
});
