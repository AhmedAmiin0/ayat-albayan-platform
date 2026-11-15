import { MicError, type PeerLike, type StreamLike, type TrackLike } from '@ab/client-core';
import type { CallIceServer } from '@ab/shared';

// The phone side of a WhatsApp call (docs/28 §2): this device IS the WebRTC peer, its audio flows
// directly to Meta; only the SDP goes through our API. The shapes below are the part of
// react-native-webrtc the call uses (@ab/client-core's, plus addTrack), injected so tests run with fakes.

/** react-native-webrtc's connection: the shared shape plus the microphone's track. */
export interface NativePeer extends PeerLike {
  addTrack(track: TrackLike, stream: StreamLike): unknown;
}

export interface RtcDeps {
  createPeer: (config: { iceServers: CallIceServer[] }) => NativePeer;
  /** Android's runtime prompt for RECORD_AUDIO (iOS asks inside getMic); `blocked` = «don't ask again». */
  askMic: () => Promise<MicAnswer>;
  getMic: () => Promise<StreamLike>;
}

export type MicAnswer = 'granted' | 'denied' | 'blocked';

/** The microphone (asked for at call time); MicError when it cannot be had. */
export async function openMic(deps: RtcDeps | null): Promise<StreamLike> {
  if (!deps) throw new MicError('unsupported');
  const answer = await deps.askMic();
  if (answer !== 'granted') throw new MicError(answer);
  try {
    return await deps.getMic();
  } catch {
    throw new MicError('denied');
  }
}

export const rtcConfig = (iceServers: readonly CallIceServer[]): { iceServers: CallIceServer[] } => ({
  iceServers: iceServers.map((s) => ({ ...s, urls: [...s.urls] })),
});
