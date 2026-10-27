import { setAudioModeAsync } from 'expo-audio';

// Speaker vs earpiece for a call (docs/28 §5 «مكبر الصوت»). react-native-webrtc has no routing API of
// its own; expo-audio's audio mode routes the session. Outside a call the app runs one PLAYBACK mode,
// set at start (applyPlaybackMode) and put back after every call, so voice notes and videos behave the
// same before and after a call. Best effort: a failure keeps the current route.

/**
 * The app's playback mode, chosen deliberately: Android takes audio focus («doNotMix», the players'
 * behaviour so far: other apps pause), iOS respects the silent switch, the speaker plays, no recording.
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
  const call = { ...PLAYBACK, playsInSilentMode: true, allowsRecording: true, shouldRouteThroughEarpiece: !speaker };
  await setAudioModeAsync(call).catch(() => undefined);
}

/** After a call (or a failed start that had routed): the app's playback mode again; a no-op otherwise. */
export async function restorePlayback(): Promise<void> {
  if (!routed) return;
  routed = false;
  await applyPlaybackMode();
}
