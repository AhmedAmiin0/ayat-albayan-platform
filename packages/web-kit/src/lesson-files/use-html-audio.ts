import {
  initialPlayer, playerReducer, type PlayerEvent, type PlayerSpeed, type PlayerState,
} from '@ab/client-core';
import { useReducer, useState, type SyntheticEvent } from 'react';
import { saveResume } from './use-resume';

/** Saved at most this often while the file plays. */
const SAVE_EVERY_SECONDS = 5;

/** Did the play move into the next 5-second step since the last tick? */
const crossed = (before: number, now: number): boolean =>
  Math.floor(before / SAVE_EVERY_SECONDS) !== Math.floor(now / SAVE_EVERY_SECONDS);

export interface HtmlAudio {
  /** Spread on the <audio>: its element and the media events that drive the reducer. */
  media: {
    ref: (el: HTMLAudioElement | null) => void;
    onLoadedMetadata: (e: SyntheticEvent<HTMLAudioElement>) => void;
    onTimeUpdate: (e: SyntheticEvent<HTMLAudioElement>) => void;
    onEnded: () => void;
    onError: () => void;
  };
  state: PlayerState;
  controls: {
    toggle: () => void;
    skip: (direction: 1 | -1) => void;
    setSpeed: (speed: PlayerSpeed) => void;
    seek: (position: number) => void;
    startOver: () => void;
  };
}

/**
 * The web player over an <audio> element (owner 2026-11-17): the same reducer as the app's,
 * the stop saved on pause, skip, the end and every few seconds of play.
 */
export function useHtmlAudio(input: { id: string; startAt: number }): HtmlAudio {
  const [startAt] = useState(input.startAt);
  const [state, dispatch] = useReducer(playerReducer, initialPlayer(startAt));
  const [element, setElement] = useState<HTMLAudioElement | null>(null);
  const save = (s: PlayerState): void =>
    saveResume({ id: input.id, position: s.position, duration: s.duration });
  const send = (event: PlayerEvent, effect: (s: PlayerState, media: HTMLAudioElement) => void) => {
    const next = playerReducer(state, event);
    dispatch(event);
    if (element) effect(next, element);
  };
  const playing = state.status === 'playing';
  const failed = (): void => dispatch({ type: 'failed' });
  return {
    state,
    media: {
      ref: setElement,
      onLoadedMetadata: (e) => {
        e.currentTarget.currentTime = startAt;
        dispatch({ type: 'loaded', duration: e.currentTarget.duration });
      },
      onTimeUpdate: (e) => {
        const position = e.currentTarget.currentTime;
        dispatch({ type: 'time', position });
        if (crossed(state.position, position)) save({ ...state, position });
      },
      onEnded: () => send({ type: 'ended' }, save),
      onError: failed,
    },
    controls: controlsOf({ send, save, playing, failed }),
  };
}

interface ControlDeps {
  send: (event: PlayerEvent, effect: (s: PlayerState, media: HTMLAudioElement) => void) => void;
  save: (s: PlayerState) => void;
  playing: boolean;
  failed: () => void;
}

/** The buttons: each moves the reducer, then the element. */
function controlsOf({ send, save, playing, failed }: ControlDeps): HtmlAudio['controls'] {
  const play = (media: HTMLAudioElement): void => {
    media.play().catch(failed);
  };
  const pause = (media: HTMLAudioElement): void => {
    media.pause();
  };
  return {
    toggle: () => send({ type: playing ? 'pause' : 'play' }, (s, media) => {
      (playing ? pause : play)(media);
      save(s);
    }),
    skip: (direction) => send({ type: 'skip', direction }, (s, media) => {
      media.currentTime = s.position;
      save(s);
    }),
    setSpeed: (speed) => send({ type: 'speed', speed }, (s, media) => {
      media.playbackRate = s.speed;
    }),
    seek: (position) => send({ type: 'seek', position }, (s, media) => {
      media.currentTime = s.position;
      save(s);
    }),
    startOver: () => send({ type: 'seek', position: 0 }, (_s, media) => {
      media.currentTime = 0;
    }),
  };
}
