import * as Sharing from 'expo-sharing';

// docs/38 §mobile 1: expo-sharing turns an Android share (SEND / SEND_MULTIPLE) into the VIEW URL
// ayatalbayan://expo-sharing; app/+native-intent.ts hands every incoming URL to this function.
// The activity keeps that URL after the share is read: a relaunch with the process alive (font
// size, density) or the language switch's reload reads it again, with nothing left to share.

const SHARE_HOST = 'expo-sharing';

const hostOf = (path: string): string | null => {
  try {
    return new URL(path).hostname;
  } catch {
    return null;
  }
};

/** A share is waiting in expo-sharing's store (false when it cannot be read). */
const hasShare = (): boolean => {
  try {
    return Sharing.getSharedPayloads().length > 0;
  } catch {
    return false;
  }
};

/** Where the share URL goes: the chooser, or home when nothing is left to share. */
const shareTarget = (): string => (hasShare() ? '/share' : '/');

/**
 * The share URL: '/share' while a share waits, '/' once it was read (a stale URL); any other path
 * (Stripe's return, a push link) unchanged.
 */
export function shareRedirect(path: string): string {
  return hostOf(path) === SHARE_HOST ? shareTarget() : path;
}
