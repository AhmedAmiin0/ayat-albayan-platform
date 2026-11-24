import { Linking } from 'react-native';
import type { CreateAudioSource } from '@ab/mobile-kit';

/** Hands the link to the phone's player until the family app's audio adapter is shared. */
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
