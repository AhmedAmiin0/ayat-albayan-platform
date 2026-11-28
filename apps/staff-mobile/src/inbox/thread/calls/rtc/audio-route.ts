import { setAudioModeAsync } from 'expo-audio';

// docs/28 §5: react-native-webrtc cannot route audio, so expo-audio's mode does; best effort.

/**
 * The app's playback mode, chosen deliberately: Android takes audio focus («doNotMix», so other
 * apps pause), iOS respects the silent switch, the speaker plays, no recording.
 */
export const PLAYBACK = {
  playsInSilentMode: false,
  interruptionMode: 'doNotMix',
  allowsRecording: false,
  shouldPlayInBackground: false,
  shouldRouteThroughEarpiece: false,
} as const;

/** Set by routeCallAudio: the call changed the mode, so restorePlayback puts PLAYBACK back. */
let routed = false;

export async function applyPlaybackMode(): Promise<void> {
  await setAudioModeAsync(PLAYBACK).catch(() => undefined);
}

/** The call's mode: recording on, the earpiece or (speaker) the loudspeaker. */
export async function routeCallAudio(speaker: boolean): Promise<void> {
  routed = true;
  const call = {
    ...PLAYBACK,
    playsInSilentMode: true,
    allowsRecording: true,
    shouldRouteThroughEarpiece: !speaker,
  };
  await setAudioModeAsync(call).catch(() => undefined);
}

/** After a call (or a failed start that had routed): back to the playback mode; else a no-op. */
export async function restorePlayback(): Promise<void> {
  if (!routed) return;
  routed = false;
  await applyPlaybackMode();
}
