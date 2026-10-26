import { setAudioModeAsync } from 'expo-audio';

// Speaker vs earpiece for the call (docs/28 §5 «مكبر الصوت»). react-native-webrtc has no routing API of
// its own; expo-audio's audio mode routes the session (earpiece while in a call, the speaker on demand)
// and the app's playback mode comes back after the call. Best effort: a failure keeps the current route.

/** The app's playback mode (expo-audio's defaults: the voice notes and videos play as before). */
const PLAYBACK = {
  playsInSilentMode: true,
  interruptionMode: 'mixWithOthers',
  allowsRecording: false,
  shouldPlayInBackground: false,
  shouldRouteThroughEarpiece: false,
} as const;

export async function routeCallAudio(speaker: boolean): Promise<void> {
  await setAudioModeAsync({ ...PLAYBACK, interruptionMode: 'doNotMix', allowsRecording: true, shouldRouteThroughEarpiece: !speaker }).catch(
    () => undefined,
  );
}

export async function restorePlayback(): Promise<void> {
  await setAudioModeAsync(PLAYBACK).catch(() => undefined);
}
