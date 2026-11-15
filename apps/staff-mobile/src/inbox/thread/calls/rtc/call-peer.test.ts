import { MicError, type StreamLike } from '@ab/client-core';
import { createCallPeer } from './call-peer';
import type { NativePeer, RtcDeps } from './media';

function fakeMic() {
  const track = { enabled: true, stop: jest.fn() };
  const release = jest.fn();
  const mic: StreamLike = { getAudioTracks: () => [track], getTracks: () => [track], release };
  return { track, mic, release };
}

function fakePeer(): NativePeer & { remote: unknown[]; listeners: Map<string, () => void> } {
  const listeners = new Map<string, () => void>();
  const remote: unknown[] = [];
  const pc = {
    iceGatheringState: 'complete',
    connectionState: 'new',
    localDescription: null as { sdp: string } | null,
    remoteDescription: null as unknown,
    remote,
    listeners,
    createOffer: jest.fn(async () => ({ type: 'offer' as const, sdp: 'v=0 offer' })),
    createAnswer: jest.fn(async () => ({ type: 'answer' as const, sdp: 'v=0 answer' })),
    setLocalDescription: jest.fn(async (d: { sdp: string }) => void (pc.localDescription = d)),
    setRemoteDescription: jest.fn(async (d: unknown) => void (remote.push(d), (pc.remoteDescription = d))),
    addTrack: jest.fn(),
    addEventListener: (type: string, l: () => void) => void listeners.set(type, l),
    removeEventListener: jest.fn(),
    close: jest.fn(),
  };
  return pc;
}

const deps = (pc: NativePeer, mic: StreamLike, answer: 'granted' | 'denied' | 'blocked' = 'granted'): RtcDeps => ({
  createPeer: () => pc,
  askMic: async () => answer,
  getMic: async () => mic,
});

describe('createCallPeer (react-native-webrtc behind fakes)', () => {
  it('outbound: the gathered offer; WhatsApp\'s answer applied once; mute toggles the track', async () => {
    const pc = fakePeer();
    const { mic, track, release } = fakeMic();
    const peer = await createCallPeer({ deps: deps(pc, mic), iceServers: [{ urls: ['stun:stun.example.org'] }] });
    await expect(peer.offer()).resolves.toBe('v=0 offer');
    await peer.applyAnswer('v=0 a');
    await peer.applyAnswer('v=0 b');
    expect(pc.remote).toEqual([{ type: 'answer', sdp: 'v=0 a' }]);
    peer.setMuted(true);
    expect(track.enabled).toBe(false);
    peer.close();
    expect(track.stop).toHaveBeenCalled();
    // react-native-webrtc keeps the native stream (and the mic) until release().
    expect(release).toHaveBeenCalled();
    expect(pc.close).toHaveBeenCalled();
  });

  it('inbound: the answer to the family\'s offer', async () => {
    const pc = fakePeer();
    const peer = await createCallPeer({ deps: deps(pc, fakeMic().mic), iceServers: [] });
    await expect(peer.answer('v=0 their offer')).resolves.toBe('v=0 answer');
    expect(pc.remote).toEqual([{ type: 'offer', sdp: 'v=0 their offer' }]);
  });

  it('a refused microphone is MicError(denied); no WebRTC is unsupported; a broken peer stops the mic', async () => {
    const pc = fakePeer();
    const { mic, track } = fakeMic();
    await expect(createCallPeer({ deps: deps(pc, mic, 'denied'), iceServers: [] })).rejects.toEqual(new MicError('denied'));
    await expect(createCallPeer({ deps: deps(pc, mic, 'blocked'), iceServers: [] })).rejects.toMatchObject({ problem: 'blocked' });
    await expect(createCallPeer({ deps: null, iceServers: [] })).rejects.toMatchObject({ problem: 'unsupported' });
    const broken: RtcDeps = { ...deps(pc, mic), createPeer: () => { throw new Error('boom'); } };
    await expect(createCallPeer({ deps: broken, iceServers: [] })).rejects.toThrow('boom');
    expect(track.stop).toHaveBeenCalled();
  });

  it('onFailed fires when the media drops for good', async () => {
    const pc = fakePeer();
    const peer = await createCallPeer({ deps: deps(pc, fakeMic().mic), iceServers: [] });
    const failed = jest.fn();
    peer.onFailed(failed);
    Object.assign(pc, { connectionState: 'failed' });
    pc.listeners.get('connectionstatechange')?.();
    expect(failed).toHaveBeenCalled();
  });
});
