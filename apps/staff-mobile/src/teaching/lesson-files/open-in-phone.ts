import { Linking } from 'react-native';
import type { CreateAudioSource } from '@ab/mobile-kit';

/**
 * The staff app's AudioSource for the kit player: an unknown length, and «تشغيل» hands the link
 * to the phone's own player, as before. The family app plays in-app through expo-audio
 * (apps/family-mobile/src/recordings/player); the staff app keeps this until that adapter has a
 * home both apps can import (no copy).
 */
export const openInPhonePlayer: CreateAudioSource = ({ url, events }) => {
  queueMicrotask(() => events.onLoaded(0));
  return {
    play: () => {
      Linking.openURL(url).catch(events.onFailed);
    },
    pause: () => undefined,
    seekTo: () => undefined,
    setRate: () => undefined,
    release: () => undefined,
  };
};
