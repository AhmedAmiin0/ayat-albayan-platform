import { PermissionsAndroid, Platform } from 'react-native';
import { mediaDevices, RTCPeerConnection } from 'react-native-webrtc';
import type { PeerLike, RtcDeps, StreamLike } from './media';

/** RECORD_AUDIO at call time (the manifest declares it, docs/28 PR 2); iOS prompts on getUserMedia. */
async function askMic(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * The device's WebRTC (react-native-webrtc, a native module: a new APK, docs/28 PR 2). The family's
 * audio plays by itself once its track arrives; the shapes match media.ts structurally.
 */
export function nativeRtc(): RtcDeps {
  return {
    createPeer: (config) => new RTCPeerConnection(config) as unknown as PeerLike,
    askMic,
    getMic: async () => (await mediaDevices.getUserMedia({ audio: true, video: false })) as unknown as StreamLike,
  };
}
