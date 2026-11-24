import type { CallPlatform, PeerMaker } from '@ab/client-core';
import { requestId } from '@/core/lib/http/request-id';
import { t } from '@ab/mobile-kit';
import { callApi } from '@/inbox/thread/calls/api/calls-api';
import { restorePlayback, routeCallAudio } from '@/inbox/thread/calls/rtc/audio-route';
import { createCallPeer } from '@/inbox/thread/calls/rtc/call-peer';
import type { RtcDeps } from '@/inbox/thread/calls/rtc/media';

/** Mobile's side of the shared call steps: its API, ids and words, and the earpiece / speaker route. */
export const mobileCalls: CallPlatform = {
  sends: callApi,
  requestId,
  text: () => t.calls,
  audio: { route: routeCallAudio, restore: restorePlayback },
};

/**
 * The device's peers (react-native-webrtc), its module loaded at the first call: without it the
 * call says «لا يدعم المكالمات» (openMic's «unsupported»).
 */
export const peerMaker =
  (rtc: () => Promise<RtcDeps | null>): PeerMaker =>
  async (iceServers) =>
    createCallPeer({ deps: await rtc(), iceServers });
