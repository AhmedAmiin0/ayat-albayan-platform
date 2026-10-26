import { createCallPeer, gathered } from './call-peer';
import { MicError, type PeerLike, type RtcDeps, type StreamLike } from './media';

function fakeMic() {
  const track = { enabled: true, stop: jest.fn() };
  const mic: StreamLike = { getAudioTracks: () => [track], getTracks: () => [track] };
  return { track, mic };
}

function fakePeer(): PeerLike & { remote: unknown[]; listeners: Map<string, () => void> } {
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

const deps = (pc: PeerLike, mic: StreamLike, granted = true): RtcDeps => ({ createPeer: () => pc, askMic: async () => granted, getMic: async () => mic });

describe('createCallPeer (react-native-webrtc behind fakes)', () => {
  it('outbound: the gathered offer; WhatsApp\'s answer applied once; mute toggles the track', async () => {
    const pc = fakePeer();
    const { mic, track } = fakeMic();
    const peer = await createCallPeer({ deps: deps(pc, mic), iceServers: [{ urls: ['stun:stun.example.org'] }] });
    await expect(peer.offer()).resolves.toBe('v=0 offer');
    await peer.applyAnswer('v=0 a');
    await peer.applyAnswer('v=0 b');
    expect(pc.remote).toEqual([{ type: 'answer', sdp: 'v=0 a' }]);
    peer.setMuted(true);
    expect(track.enabled).toBe(false);
    peer.close();
    expect(track.stop).toHaveBeenCalled();
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
    await expect(createCallPeer({ deps: deps(pc, mic, false), iceServers: [] })).rejects.toEqual(new MicError('denied'));
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

describe('gathered', () => {
  it('waits for complete, or gives up after the cap', async () => {
    jest.useFakeTimers();
    const pc = { ...fakePeer(), iceGatheringState: 'gathering' };
    const done = jest.fn();
    void gathered(pc, 3000).then(done);
    await jest.advanceTimersByTimeAsync(2999);
    expect(done).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(done).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
