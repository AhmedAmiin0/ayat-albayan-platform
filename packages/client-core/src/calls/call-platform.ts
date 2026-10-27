import type { CallIceServer } from '@ab/shared';
import type { CallPeer } from './call-peer.js';
import type { CallSends } from './calls-api.js';
import type { CallsText } from './call-words.js';

/** What each app injects into the call steps: its API, its ids, its words and (mobile) its audio route. */
export interface CallPlatform {
  sends: Pick<CallSends, 'startCall' | 'acceptCall' | 'rejectCall' | 'endCall'>;
  requestId: () => string;
  /** The app's `t.calls`, read on every use. */
  text: () => CallsText;
  /** Mobile: the call's route (earpiece or loudspeaker), and the app's playback mode back after a call. */
  audio?: { route: (speaker: boolean) => Promise<void>; restore: () => Promise<void> };
}

/** Opens the microphone and builds the peer for the academy's ICE servers (MicError when it cannot). */
export type PeerMaker = (iceServers: readonly CallIceServer[]) => Promise<CallPeer>;

/** A notice's own action: «افتح الإعدادات» when the microphone was refused for good. */
export type NoticeAction = 'settings';
