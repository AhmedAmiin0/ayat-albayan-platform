import type { CallIceServer } from '@ab/shared';
import { openMic, rtcConfig, type PeerLike, type RtcDeps, type StreamLike } from './media';

/** ICE gathering normally ends in well under a second; the SDP goes with what it has after this. */
export const GATHER_MS = 3_000;

/** One call's RTCPeerConnection and microphone, and the SDP steps WhatsApp needs. */
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

const stopAll = (mic: StreamLike) => {
  for (const track of mic.getTracks()) track.stop();
};

/** The peer for a call: the microphone opened (or MicError), its track added; nothing leaks on failure. */
export async function createCallPeer(input: { deps: RtcDeps | null; iceServers: readonly CallIceServer[] }): Promise<CallPeer> {
  const mic = await openMic(input.deps);
  let pc: PeerLike;
  try {
    if (!input.deps) throw new Error('no webrtc');
    pc = input.deps.createPeer(rtcConfig(input.iceServers));
    for (const track of mic.getAudioTracks()) pc.addTrack(track, mic);
  } catch (e) {
    stopAll(mic);
    throw e;
  }
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
      stopAll(mic);
      pc.close();
    },
  };
}
