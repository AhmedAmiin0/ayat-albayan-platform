import { describe, expect, it, vi } from 'vitest';
import { createCallPeer, gathered } from './call-peer';
import { MicError, openMic, type RtcDeps } from './media';

class FakePeer extends EventTarget {
  iceGatheringState: RTCIceGatheringState = 'complete';
  connectionState: RTCPeerConnectionState = 'new';
  localDescription: { type: string; sdp: string } | null = null;
  remoteDescription: { type: string; sdp: string } | null = null;
  addTrack = vi.fn();
  close = vi.fn();
  createOffer = vi.fn(async () => ({ type: 'offer', sdp: 'v=0 offer' }));
  createAnswer = vi.fn(async () => ({ type: 'answer', sdp: 'v=0 answer' }));
  setLocalDescription = vi.fn(async (d: { type: string; sdp: string }) => void (this.localDescription = d));
  setRemoteDescription = vi.fn(async (d: { type: string; sdp: string }) => void (this.remoteDescription = d));
}

function fakes() {
  const track = { enabled: true, stop: vi.fn() };
  const stream = { getAudioTracks: () => [track], getTracks: () => [track] } as unknown as MediaStream;
  const pc = new FakePeer();
  const deps: RtcDeps = { createPeer: vi.fn(() => pc as unknown as RTCPeerConnection), getMic: vi.fn(async () => stream) };
  return { pc, deps, track };
}

describe('the browser peer (no network: fakes)', () => {
  it('outbound: our gathered offer; WhatsApp\'s answer applied once', async () => {
    const { pc, deps } = fakes();
    const peer = await createCallPeer({ deps, iceServers: [{ urls: ['stun:stun.example.org'] }] });
    expect(deps.createPeer).toHaveBeenCalledWith(expect.objectContaining({ iceServers: [{ urls: ['stun:stun.example.org'] }] }));
    expect(await peer.offer()).toBe('v=0 offer');
    await peer.applyAnswer('v=0 a');
    await peer.applyAnswer('v=0 b');
    expect(pc.setRemoteDescription).toHaveBeenCalledTimes(1);
  });

  it('inbound: answers the family\'s offer', async () => {
    const { pc, deps } = fakes();
    const peer = await createCallPeer({ deps, iceServers: [] });
    expect(await peer.answer('v=0 their')).toBe('v=0 answer');
    expect(pc.remoteDescription).toEqual({ type: 'offer', sdp: 'v=0 their' });
  });

  it('mute disables the mic track; close stops it and the connection', async () => {
    const { pc, deps, track } = fakes();
    const peer = await createCallPeer({ deps, iceServers: [] });
    peer.setMuted(true);
    expect(track.enabled).toBe(false);
    peer.close();
    expect(track.stop).toHaveBeenCalled();
    expect(pc.close).toHaveBeenCalled();
  });

  it('a gathering that never completes gives up after the timeout', async () => {
    vi.useFakeTimers();
    const pc = new FakePeer();
    pc.iceGatheringState = 'gathering';
    const done = gathered(pc as unknown as RTCPeerConnection, 3_000);
    vi.advanceTimersByTime(3_000);
    await expect(done).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});

describe('a peer that cannot be built', () => {
  it('stops the microphone it opened', async () => {
    const { deps, track } = fakes();
    const broken: RtcDeps = { ...deps, createPeer: () => { throw new Error('no peer'); } };
    await expect(createCallPeer({ deps: broken, iceServers: [] })).rejects.toThrow('no peer');
    expect(track.stop).toHaveBeenCalled();
  });
});

describe('the microphone', () => {
  it('no WebRTC = unsupported; a refusal = denied', async () => {
    await expect(openMic(null)).rejects.toMatchObject({ problem: 'unsupported' });
    const deps: RtcDeps = { createPeer: vi.fn(), getMic: vi.fn(async () => Promise.reject(Object.assign(new Error('x'), { name: 'NotAllowedError' }))) };
    const e = await openMic(deps).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(MicError);
    expect(e).toMatchObject({ problem: 'denied' });
  });
});
