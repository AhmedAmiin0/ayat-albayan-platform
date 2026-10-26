import type { CallIceServer } from '@ab/shared';

// The phone side of a WhatsApp call (docs/28 §2): this device IS the WebRTC peer, its audio flows
// directly to Meta; only the SDP goes through our API. The shapes below are the part of
// react-native-webrtc the call uses, injected so tests run with fakes (no network, no native module).

export interface TrackLike {
  enabled: boolean;
  stop(): void;
}

export interface StreamLike {
  getAudioTracks(): TrackLike[];
  getTracks(): TrackLike[];
  /** react-native-webrtc: frees the native stream (track.stop() alone keeps the microphone held). */
  release?(): void;
}

export interface SdpInit {
  type: 'offer' | 'answer';
  sdp: string;
}

export interface PeerLike {
  readonly iceGatheringState: string;
  readonly connectionState: string;
  readonly localDescription: { sdp: string } | null;
  readonly remoteDescription: unknown;
  createOffer(options?: object): Promise<SdpInit>;
  createAnswer(): Promise<SdpInit>;
  setLocalDescription(d: SdpInit): Promise<void>;
  setRemoteDescription(d: SdpInit): Promise<void>;
  addTrack(track: TrackLike, stream: StreamLike): unknown;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
  close(): void;
}

export interface RtcDeps {
  createPeer: (config: { iceServers: CallIceServer[] }) => PeerLike;
  /** Android's runtime prompt for RECORD_AUDIO (iOS asks inside getMic); `blocked` = «don't ask again». */
  askMic: () => Promise<MicAnswer>;
  getMic: () => Promise<StreamLike>;
}

export type MicAnswer = 'granted' | 'denied' | 'blocked';

/** Why the microphone could not be opened: refused, refused for good (only Settings helps), or no WebRTC here. */
export type MicProblem = 'denied' | 'blocked' | 'unsupported';

export class MicError extends Error {
  constructor(readonly problem: MicProblem) {
    super(`microphone ${problem}`);
  }
}

/** Stops every track and frees the native stream (the microphone light goes off). */
export function releaseMic(mic: StreamLike): void {
  for (const track of mic.getTracks()) track.stop();
  mic.release?.();
}

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
