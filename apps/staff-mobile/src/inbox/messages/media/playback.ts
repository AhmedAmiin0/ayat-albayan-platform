import { setAudioModeAsync } from 'expo-audio';

type Playing = { id: string; pause: () => void };

// Only ONE voice note (or video) plays in the whole app, as WhatsApp: starting one pauses the other.
let current: Playing | null = null;

/** `id` starts: the one playing before it (another id) is paused first. */
export function claimPlayback(id: string, pause: () => void): void {
  if (current && current.id !== id) current.pause();
  current = { id, pause };
}

/** `id` unmounted (its player released): never pause it later. */
export function releasePlayback(id: string): void {
  if (current?.id === id) current = null;
}

let mode: Promise<void> | null = null;

/**
 * Once per run, before the first voice note plays (expo-audio 57): heard with the ringer on silent
 * (iOS defaults to muted; Android's default is already true), other apps' audio paused while it plays
 * (doNotMix: Android audio focus GAIN_TRANSIENT), never in the background. A failure is tried again next time.
 */
export function ensureAudioMode(): Promise<void> {
  mode ??= setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix', shouldPlayInBackground: false }).catch(() => {
    mode = null;
  });
  return mode;
}
