import { PermissionsAndroid, Platform } from 'react-native';
import type { StreamLike } from '@ab/client-core';
import type { MicAnswer, NativePeer, RtcDeps } from './media';

type WebRtc = typeof import('react-native-webrtc');

/** RECORD_AUDIO at call time (the manifest declares it, docs/28 PR 2); iOS prompts on getUserMedia. */
async function askMic(): Promise<MicAnswer> {
  if (Platform.OS !== 'android') return 'granted';
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  if (result === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
  return result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied';
}

/** The native module, loaded on first use: a binary without it (an old APK) gets null, never a crash at boot. */
function load(): WebRtc | null {
  try {
    // oxlint-disable-next-line typescript/no-require-imports -- loaded lazily: an APK without the module gets null
    return require('react-native-webrtc') as WebRtc;
  } catch {
    return null;
  }
}

/**
 * The device's WebRTC (react-native-webrtc, a native module: a new APK, docs/28 PR 2), or null where it
 * is missing (the calls then say «هذا الجهاز لا يدعم المكالمات»). The family's audio plays by itself
 * once its track arrives; the shapes match media.ts structurally.
 */
export function nativeRtc(): RtcDeps | null {
  const rtc = load();
  if (!rtc) return null;
  return {
    createPeer: (config) => new rtc.RTCPeerConnection(config) as unknown as NativePeer,
    askMic,
    getMic: async () => (await rtc.mediaDevices.getUserMedia({ audio: true, video: false })) as unknown as StreamLike,
  };
}
