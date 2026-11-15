import type { CallPlatform, PeerMaker } from '@ab/client-core';
import { t } from '@/lib/i18n/i18n';
import { callApi } from '@/features/messaging/calls/api/calls-api';
import { createCallPeer } from '@/features/messaging/calls/rtc/call-peer';
import type { RtcDeps } from '@/features/messaging/calls/rtc/media';

/** The web's side of the shared call steps: its API, ids and words (the browser has no speaker switch). */
export const webCalls: CallPlatform = {
  sends: callApi,
  requestId: () => crypto.randomUUID(),
  text: () => t.calls,
};

/** The browser's peers, the family's audio played on `play`; none without WebRTC («لا يدعم المكالمات»). */
export const peerMaker = (rtc: RtcDeps | null, play: (stream: MediaStream) => void): PeerMaker | null =>
  rtc ? (iceServers) => createCallPeer({ deps: rtc, iceServers, play }) : null;
