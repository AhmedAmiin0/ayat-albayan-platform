import type * as WebRtcModule from '@livekit/react-native-webrtc';
import { PermissionsAndroid, Platform } from 'react-native';
import type { MicAnswer, RtcDeps } from './media';

type WebRtc = typeof WebRtcModule;

/** RECORD_AUDIO at call time (the manifest declares it, docs/28); iOS prompts on getUserMedia. */
async function askMic(): Promise<MicAnswer> {
  if (Platform.OS !== 'android') return 'granted';
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  if (result === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
  return result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied';
}

/**
 * Imported on first use, never at boot: on a binary without the module (an old APK) the import
 * rejects and the calls get null instead of a crash.
 */
let cached: Promise<WebRtc | null> | undefined;
const load = (): Promise<WebRtc | null> => {
  cached ??= import('@livekit/react-native-webrtc').catch(() => null);
  return cached;
};

const depsOf = (rtc: WebRtc): RtcDeps => ({
  createPeer: (config) => new rtc.RTCPeerConnection(config),
  askMic,
  getMic: async () => rtc.mediaDevices.getUserMedia({ audio: true, video: false }),
});

/** Null where the native module is missing, docs/35; the shapes match media.ts structurally. */
export async function nativeRtc(): Promise<RtcDeps | null> {
  const rtc = await load();
  return rtc ? depsOf(rtc) : null;
}
