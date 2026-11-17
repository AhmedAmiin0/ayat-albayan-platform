import { useEffect, useReducer, useRef, useState } from 'react';
import {
  initialPlayer, playerReducer, type PlayerEvent, type PlayerSpeed, type PlayerState,
} from '@ab/client-core';
import type { AudioSource, CreateAudioSource } from './audio-source';
import { saveResume } from './use-resume';

interface AudioPlayerInput {
  id: string;
  url: string;
  startAt: number;
  createSource: CreateAudioSource;
}

export interface AudioPlayerControls {
  state: PlayerState;
  toggle: () => void;
  skip: (direction: 1 | -1) => void;
  setSpeed: (speed: PlayerSpeed) => void;
  seek: (position: number) => void;
  startOver: () => void;
}

/**
 * One recording's player: the reducer holds the state, the AudioSource plays it. The stop is
 * saved on pause and skip, every few seconds while playing, and when the screen goes away.
 */
export function useAudioPlayer(input: AudioPlayerInput): AudioPlayerControls {
  // The saved stop is read once: a save while playing never restarts the source.
  const [startAt] = useState(input.startAt);
  const [state, dispatch] = useReducer(playerReducer, initialPlayer(startAt));
  const source = useAudioSource({ ...input, startAt, dispatch });
  const send = (event: PlayerEvent, effect: (s: PlayerState, media: AudioSource) => void) => {
    const next = playerReducer(state, event);
    dispatch(event);
    if (source.current) effect(next, source.current);
  };
  const save = (s: PlayerState): void =>
    saveResume({ id: input.id, position: s.position, duration: s.duration });
  const playing = state.status === 'playing';
  return {
    state,
    toggle: () => send({ type: playing ? 'pause' : 'play' }, (s, media) => {
      (playing ? media.pause : media.play)();
      save(s);
    }),
    skip: (direction) => send({ type: 'skip', direction }, (s, media) => {
      media.seekTo(s.position);
      save(s);
    }),
    setSpeed: (speed) => send({ type: 'speed', speed }, (s, media) => media.setRate(s.speed)),
    seek: (position) => send({ type: 'seek', position }, (s, media) => {
      media.seekTo(s.position);
      save(s);
    }),
    startOver: () => send({ type: 'seek', position: 0 }, (_s, media) => media.seekTo(0)),
  };
}

/** Saved at most this often while the file plays. */
const SAVE_EVERY_SECONDS = 5;

type SourceInput = AudioPlayerInput & { dispatch: (event: PlayerEvent) => void };

/** Opens the source for this file, feeds its events to the reducer, saves and frees it on leave. */
function useAudioSource(input: SourceInput): { current: AudioSource | null } {
  const source = useRef<AudioSource | null>(null);
  const { id, url, startAt, createSource, dispatch } = input;
  useEffect(() => {
    const heard = { position: startAt, duration: 0, saved: startAt };
    const keep = (): void => {
      heard.saved = heard.position;
      saveResume({ id, position: heard.position, duration: heard.duration });
    };
    const opened = createSource({ url, startAt, events: {
      onLoaded: (duration) => {
        heard.duration = duration;
        dispatch({ type: 'loaded', duration });
      },
      onTime: (position) => {
        heard.position = position;
        dispatch({ type: 'time', position });
        if (Math.abs(position - heard.saved) >= SAVE_EVERY_SECONDS) keep();
      },
      onEnded: () => {
        heard.position = heard.duration;
        keep();
        dispatch({ type: 'ended' });
      },
      onFailed: () => dispatch({ type: 'failed' }),
    } });
    source.current = opened;
    return () => {
      keep();
      opened.release();
      source.current = null;
    };
  }, [id, url, startAt, createSource, dispatch]);
  return source;
}
