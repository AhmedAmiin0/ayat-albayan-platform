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
  /** Android's runtime prompt for RECORD_AUDIO (iOS asks inside getMic); false = refused. */
  askMic: () => Promise<boolean>;
  getMic: () => Promise<StreamLike>;
}

/** Why the microphone could not be opened: the user refused, or no WebRTC on this device. */
export type MicProblem = 'denied' | 'unsupported';

export class MicError extends Error {
  constructor(readonly problem: MicProblem) {
    super(`microphone ${problem}`);
  }
}

/** The microphone (asked for at call time); MicError when it cannot be had. */
export async function openMic(deps: RtcDeps | null): Promise<StreamLike> {
  if (!deps) throw new MicError('unsupported');
  if (!(await deps.askMic())) throw new MicError('denied');
  try {
    return await deps.getMic();
  } catch {
    throw new MicError('denied');
  }
}

export const rtcConfig = (iceServers: readonly CallIceServer[]): { iceServers: CallIceServer[] } => ({
  iceServers: iceServers.map((s) => ({ ...s, urls: [...s.urls] })),
});
