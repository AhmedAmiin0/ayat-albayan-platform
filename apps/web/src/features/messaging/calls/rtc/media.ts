import { MicError } from '@ab/client-core';
import type { CallIceServer } from '@ab/shared';

// The browser side of a WhatsApp call (docs/28 §2): this device IS the WebRTC peer, its audio flows
// directly to Meta; only the SDP goes through our API. Injected so tests run with fakes (no network).

export interface RtcDeps {
  createPeer: (config: RTCConfiguration) => RTCPeerConnection;
  getMic: () => Promise<MediaStream>;
}

/** The real browser, or null when it has no WebRTC (an old browser, an insecure origin). */
export function browserRtc(): RtcDeps | null {
  const md = typeof navigator === 'undefined' ? undefined : navigator.mediaDevices;
  if (typeof RTCPeerConnection === 'undefined' || !md?.getUserMedia) return null;
  return {
    createPeer: (config) => new RTCPeerConnection(config),
    getMic: () => md.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false }),
  };
}

/** The microphone (the browser asks for permission the first time); MicError when it cannot. */
export async function openMic(deps: RtcDeps | null): Promise<MediaStream> {
  if (!deps) throw new MicError('unsupported');
  try {
    return await deps.getMic();
  } catch (e) {
    const name = e instanceof Error ? e.name : '';
    throw new MicError(name === 'NotFoundError' || name === 'NotSupportedError' ? 'unsupported' : 'denied');
  }
}

export const rtcConfig = (iceServers: readonly CallIceServer[]): RTCConfiguration => ({
  iceServers: iceServers.map((s) => ({ ...s, urls: [...s.urls] })),
  bundlePolicy: 'max-bundle',
});
