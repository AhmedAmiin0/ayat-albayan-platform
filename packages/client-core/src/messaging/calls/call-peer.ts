// The WebRTC side of a call (docs/28 §2): this device IS the peer, its audio flows directly to Meta;
// only the SDP goes through our API. The shapes are the part of RTCPeerConnection / MediaStream both the
// browser and react-native-webrtc have; each app opens the microphone and builds the connection.

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

export interface PeerLike {
  readonly iceGatheringState: string;
  readonly connectionState: string;
  readonly localDescription: { sdp: string } | null;
  readonly remoteDescription: unknown;
  createOffer(options?: object): Promise<unknown>;
  createAnswer(): Promise<unknown>;
  setLocalDescription(description: unknown): Promise<void>;
  setRemoteDescription(description: { type: 'offer' | 'answer'; sdp: string }): Promise<void>;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
  close(): void;
}

/** Why the microphone could not be opened: refused, refused for good (only Settings helps), or no WebRTC here. */
export type MicProblem = 'denied' | 'blocked' | 'unsupported';

export class MicError extends Error {
  readonly problem: MicProblem;
  constructor(problem: MicProblem) {
    super(`microphone ${problem}`);
    this.problem = problem;
  }
}

/** One call's connection and microphone, and the SDP steps WhatsApp needs. */
export interface CallPeer {
  /** Outbound: our offer, with its ICE candidates gathered. */
  offer(): Promise<string>;
  /** Inbound: the answer to the family's offer, gathered. */
  answer(offerSdp: string): Promise<string>;
  /** Outbound: WhatsApp's answer from the connect webhook (applied once). */
  applyAnswer(answerSdp: string): Promise<void>;
  setMuted(muted: boolean): void;
  /** Media dropped for good (ICE failed). */
  onFailed(handle: () => void): void;
  close(): void;
}

/** ICE gathering normally ends in well under a second; the SDP goes with what it has after this. */
export const GATHER_MS = 3_000;

/** Stops every track and frees the native stream (the microphone light goes off). */
export function releaseMic(mic: StreamLike): void {
  for (const track of mic.getTracks()) track.stop();
  mic.release?.();
}

/** Resolves once gathering is complete, or after `ms` (then the SDP carries the candidates found so far). */
export function gathered(pc: PeerLike, ms = GATHER_MS): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      pc.removeEventListener('icegatheringstatechange', check);
      resolve();
    };
    const check = () => {
      if (pc.iceGatheringState === 'complete') done();
    };
    const timer = setTimeout(done, ms);
    pc.addEventListener('icegatheringstatechange', check);
  });
}

/** The call over a built connection that already carries the microphone's track; close() releases both. */
export function callPeer(pc: PeerLike, mic: StreamLike): CallPeer {
  const sdpOf = () => pc.localDescription?.sdp ?? '';
  return {
    async offer() {
      await pc.setLocalDescription(await pc.createOffer({ offerToReceiveAudio: true }));
      await gathered(pc);
      return sdpOf();
    },
    async answer(offerSdp) {
      await pc.setRemoteDescription({ type: 'offer', sdp: offerSdp });
      await pc.setLocalDescription(await pc.createAnswer());
      await gathered(pc);
      return sdpOf();
    },
    async applyAnswer(answerSdp) {
      if (pc.remoteDescription) return;
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    },
    setMuted(muted) {
      for (const track of mic.getAudioTracks()) track.enabled = !muted;
    },
    onFailed(handle) {
      pc.addEventListener('connectionstatechange', () => {
        if (pc.connectionState === 'failed') handle();
      });
    },
    close() {
      releaseMic(mic);
      pc.close();
    },
  };
}
