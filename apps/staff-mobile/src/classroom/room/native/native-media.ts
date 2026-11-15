import { PermissionsAndroid, Platform } from 'react-native';
import { camMicFromAndroid } from '@/classroom/room/model/cam-mic';
import type { CamMicAnswer, PreviewCamera } from '@/classroom/room/model/room-types';
import type { LiveKitNative } from './livekit-native';

const P = PermissionsAndroid.PERMISSIONS;
const GRANTED: CamMicAnswer = { mic: 'granted', cam: 'granted' };

/**
 * Already allowed? Android only: iOS answers inside getUserMedia (the plist texts, docs/35 §4), so
 * iOS goes straight to the preview and a refusal there leaves that device off.
 */
export async function checkCamMic(): Promise<CamMicAnswer> {
  if (Platform.OS !== 'android') return GRANTED;
  const [mic, cam] = await Promise.all([
    PermissionsAndroid.check(P.RECORD_AUDIO),
    PermissionsAndroid.check(P.CAMERA),
  ]);
  return camMicFromAndroid(mic ? 'granted' : 'denied', cam ? 'granted' : 'denied');
}

/** After the MSA explanation: one Android dialog for both. */
export async function askCamMic(): Promise<CamMicAnswer> {
  if (Platform.OS !== 'android') return GRANTED;
  const r = await PermissionsAndroid.requestMultiple([P.RECORD_AUDIO, P.CAMERA]);
  return camMicFromAndroid(r[P.RECORD_AUDIO], r[P.CAMERA]);
}

/** One's own front camera before joining; null when it cannot open (refused, busy, none). */
export async function openPreview({ lk }: LiveKitNative): Promise<PreviewCamera | null> {
  try {
    const track = await lk.createLocalVideoTrack({ facingMode: 'user' });
    const stream = track.mediaStream as unknown as { toURL?: () => string } | undefined;
    const streamUrl = stream?.toURL?.();
    if (!streamUrl) {
      track.stop();
      return null;
    }
    return { streamUrl, stop: () => track.stop() };
  } catch {
    return null;
  }
}
