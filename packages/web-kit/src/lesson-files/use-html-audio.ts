import {
  initialPlayer, playerReducer, type PlayerEvent, type PlayerSpeed, type PlayerState,
} from '@ab/client-core';
import { useEffect, useReducer, useState, type SyntheticEvent } from 'react';
import { nowPlaying } from './use-now-playing';
import { saveResume } from './use-resume';

/** Saved at most this often while the file plays. */
const SAVE_EVERY_SECONDS = 5;

/** Did the play move into the next 5-second step since the last tick? */
const crossed = (before: number, now: number): boolean =>
  Math.floor(before / SAVE_EVERY_SECONDS) !== Math.floor(now / SAVE_EVERY_SECONDS);

type MediaEvent = SyntheticEvent<HTMLMediaElement>;

export interface HtmlAudio {
  /** Spread on the <audio> or <video>: its element and the media events that drive the reducer. */
  media: {
    ref: (el: HTMLMediaElement | null) => void;
    onLoadedMetadata: (e: MediaEvent) => void;
    onTimeUpdate: (e: MediaEvent) => void;
    onPause: (e: MediaEvent) => void;
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
 * The web player over an <audio> or <video> element: the same reducer as the
 * app's, the stop saved on pause, skip, the end and every few seconds of play. One player sounds
 * at a time: starting this one stops the page's other player (use-now-playing).
 */
export function useHtmlAudio(input: { id: string; startAt: number }): HtmlAudio {
  const { id } = input;
  const [startAt] = useState(input.startAt);
  const [state, dispatch] = useReducer(playerReducer, initialPlayer(startAt));
  const [element, setElement] = useState<HTMLMediaElement | null>(null);
  // Leaving the page (or another lesson) takes the player off the stage.
  useEffect(() => () => nowPlaying.release(id), [id]);
  const save = (s: PlayerState): void =>
    saveResume({ id, position: s.position, duration: s.duration });
  const send = (event: PlayerEvent, effect: (s: PlayerState, media: HTMLMediaElement) => void) => {
    const next = playerReducer(state, event);
    dispatch(event);
    if (element) effect(next, element);
  };
  const playing = state.status === 'playing';
  const failed = (): void => dispatch({ type: 'failed' });
  const stopped = (): void => nowPlaying.release(id);
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
      // Paused from outside (another player started): the button follows, the stop is kept.
      onPause: (e) => {
        stopped();
        if (!playing) return;
        dispatch({ type: 'pause' });
        save({ ...state, position: e.currentTarget.currentTime });
      },
      onEnded: () => send({ type: 'ended' }, save),
      onError: failed,
    },
    controls: controlsOf({ send, save, playing, failed, id }),
  };
}

interface ControlDeps {
  send: (event: PlayerEvent, effect: (s: PlayerState, media: HTMLMediaElement) => void) => void;
  save: (s: PlayerState) => void;
  playing: boolean;
  failed: () => void;
  id: string;
}

/** The buttons: each moves the reducer, then the element. */
function controlsOf({ send, save, playing, failed, id }: ControlDeps): HtmlAudio['controls'] {
  const play = (media: HTMLMediaElement): void => {
    nowPlaying.claim({ id, stop: () => media.pause() });
    media.play().catch(failed);
  };
  const pause = (media: HTMLMediaElement): void => {
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
