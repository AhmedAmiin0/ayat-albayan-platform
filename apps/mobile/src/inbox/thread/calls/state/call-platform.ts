import type { CallPlatform, PeerMaker } from '@ab/client-core';
import { requestId } from '@/core/lib/http/request-id';
import { t } from '@/core/lib/i18n/i18n';
import { callApi } from '../api/calls-api';
import { restorePlayback, routeCallAudio } from '../rtc/audio-route';
import { createCallPeer } from '../rtc/call-peer';
import type { RtcDeps } from '../rtc/media';

/** Mobile's side of the shared call steps: its API, ids and words, and the earpiece / speaker route. */
export const mobileCalls: CallPlatform = {
  sends: callApi,
  requestId,
  text: () => t.calls,
  audio: { route: routeCallAudio, restore: restorePlayback },
};

/** The device's peers (react-native-webrtc); none without it (the call says «لا يدعم المكالمات»). */
export const peerMaker = (rtc: RtcDeps | null): PeerMaker | null =>
  rtc ? (iceServers) => createCallPeer({ deps: rtc, iceServers }) : null;
