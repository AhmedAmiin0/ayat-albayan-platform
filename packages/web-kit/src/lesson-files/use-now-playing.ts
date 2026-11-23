import { nowPlayingStore } from '@ab/client-core';
import { useSyncExternalStore } from 'react';

/**
 * The page's one sounding player (recordings spec §6): a recording, a part or a voice note that
 * starts stops the one before it; the recordings list marks the lesson that plays.
 */
export const nowPlaying = nowPlayingStore();

const nobody = (): null => null;

/** The id that plays now, else null. */
export const useNowPlaying = (): string | null =>
  useSyncExternalStore(nowPlaying.subscribe, nowPlaying.current, nobody);
