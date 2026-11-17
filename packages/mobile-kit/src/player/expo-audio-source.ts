import { Linking } from 'react-native';
import type { CreateAudioSource } from './audio-source';

/**
 * TODO(lead, native PR): the expo-audio adapter. expo-audio is not in this build yet, so this
 * stand-in reports an unknown length and hands «تشغيل» to the phone's own player, as the app did
 * before. Replace the body with expo-audio's createAudioPlayer(url): seekTo(startAt) on load,
 * events.onLoaded(duration), events.onTime(currentTime) from its status listener,
 * onEnded at didJustFinish, onFailed on an error, setPlaybackRate(rate), remove() on release.
 */
export const createAudioSource: CreateAudioSource = ({ url, events }) => {
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
