import { callPeer, releaseMic, type CallPeer } from '@ab/client-core';
import type { CallIceServer } from '@ab/shared';
import { openMic, rtcConfig, type RtcDeps } from './media';

export interface CallPeerInput {
  deps: RtcDeps | null;
  iceServers: readonly CallIceServer[];
  /** Plays the family's audio as soon as it arrives (the provider's <audio>). */
  play: (stream: MediaStream) => void;
}

/**
 * The peer for a call (the browser's RTCPeerConnection): the microphone opened (or MicError), its track
 * added; never a microphone left on after a peer that could not be built. The SDP steps are
 * @ab/client-core's callPeer.
 */
export async function createCallPeer(input: CallPeerInput): Promise<CallPeer> {
  const mic = await openMic(input.deps);
  try {
    if (!input.deps) throw new Error('unreachable: openMic refused');
    const pc = input.deps.createPeer(rtcConfig(input.iceServers));
    for (const track of mic.getAudioTracks()) pc.addTrack(track, mic);
    pc.addEventListener('track', (e) => input.play(e.streams[0] ?? new MediaStream([e.track])));
    return callPeer(pc, mic);
  } catch (e) {
    releaseMic(mic);
    throw e;
  }
}
