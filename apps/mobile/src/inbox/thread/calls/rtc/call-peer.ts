import { callPeer, releaseMic, type CallPeer } from '@ab/client-core';
import type { CallIceServer } from '@ab/shared';
import { openMic, rtcConfig, type RtcDeps } from './media';

/**
 * The peer for a call (react-native-webrtc): the microphone opened (or MicError), its track added on a
 * new connection; nothing leaks on failure. The SDP steps are @ab/client-core's callPeer.
 */
export async function createCallPeer(input: { deps: RtcDeps | null; iceServers: readonly CallIceServer[] }): Promise<CallPeer> {
  const mic = await openMic(input.deps);
  try {
    if (!input.deps) throw new Error('no webrtc');
    const pc = input.deps.createPeer(rtcConfig(input.iceServers));
    for (const track of mic.getAudioTracks()) pc.addTrack(track, mic);
    return callPeer(pc, mic);
  } catch (e) {
    releaseMic(mic);
    throw e;
  }
}
