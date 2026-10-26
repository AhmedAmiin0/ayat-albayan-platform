import type { CallIceServer } from '@ab/shared';
import { openMic, rtcConfig, type RtcDeps } from './media';

/** ICE gathering normally ends in well under a second; the SDP goes with what it has after this. */
export const GATHER_MS = 3_000;

/** One call's RTCPeerConnection and microphone, and the SDP steps WhatsApp needs. */
export interface CallPeer {
  /** Outbound: our offer, with its ICE candidates gathered. */
  offer(): Promise<string>;
  /** Inbound: the answer to the family's offer, gathered. */
  answer(offerSdp: string): Promise<string>;
  /** Outbound: WhatsApp's answer from the connect webhook. */
  applyAnswer(answerSdp: string): Promise<void>;
  setMuted(muted: boolean): void;
  /** The family's audio, as soon as it arrives. */
  onRemote(play: (stream: MediaStream) => void): void;
  /** Media dropped for good (ICE failed). */
  onFailed(handle: () => void): void;
  close(): void;
}

/** Resolves once gathering is complete, or after `ms` (then the SDP carries the candidates found so far). */
export function gathered(pc: RTCPeerConnection, ms = GATHER_MS): Promise<void> {
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

const sdpOf = (pc: RTCPeerConnection): string => pc.localDescription?.sdp ?? '';

export async function createCallPeer(input: { deps: RtcDeps | null; iceServers: readonly CallIceServer[] }): Promise<CallPeer> {
  const mic = await openMic(input.deps);
  const deps = input.deps;
  if (!deps) throw new Error('unreachable: openMic refused');
  const pc = deps.createPeer(rtcConfig(input.iceServers));
  for (const track of mic.getAudioTracks()) pc.addTrack(track, mic);
  return {
    async offer() {
      await pc.setLocalDescription(await pc.createOffer({ offerToReceiveAudio: true }));
      await gathered(pc);
      return sdpOf(pc);
    },
    async answer(offerSdp) {
      await pc.setRemoteDescription({ type: 'offer', sdp: offerSdp });
      await pc.setLocalDescription(await pc.createAnswer());
      await gathered(pc);
      return sdpOf(pc);
    },
    async applyAnswer(answerSdp) {
      if (pc.remoteDescription) return;
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    },
    setMuted(muted) {
      for (const track of mic.getAudioTracks()) track.enabled = !muted;
    },
    onRemote(play) {
      pc.addEventListener('track', (e) => {
        const stream = e.streams[0] ?? new MediaStream([e.track]);
        play(stream);
      });
    },
    onFailed(handle) {
      pc.addEventListener('connectionstatechange', () => {
        if (pc.connectionState === 'failed') handle();
      });
    },
    close() {
      for (const track of mic.getTracks()) track.stop();
      pc.close();
    },
  };
}
