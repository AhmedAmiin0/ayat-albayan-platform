import { initialPlayer, playerReducer, type PlayerState } from '@ab/client-core';
import { useReducer, useRef, type RefObject, type SyntheticEvent } from 'react';

type AudioEvent = SyntheticEvent<HTMLAudioElement>;

/** A browser's own length: a recorded webm often says Infinity until it has played once. */
const lengthOf = (el: HTMLAudioElement): number =>
  Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0;

export interface VoiceNote {
  /** Spread on the <audio>. */
  media: {
    ref: RefObject<HTMLAudioElement | null>;
    onLoadedMetadata: (e: AudioEvent) => void;
    onTimeUpdate: (e: AudioEvent) => void;
    onPlay: () => void;
    onPause: () => void;
    onEnded: () => void;
    onError: () => void;
  };
  state: PlayerState;
  /** The note's length in seconds: the browser's, else the length the sender's app sent. */
  duration: number;
  toggle: () => void;
  seek: (position: number) => void;
}

/**
 * One voice note over an <audio> element (the shared player reducer): play and pause, a seek on
 * the waveform; the next play after the end starts over. The element's own events drive the
 * state, so another page's pause or the end is never missed.
 */
export function useVoiceNote(knownMs: number | null): VoiceNote {
  const [state, dispatch] = useReducer(playerReducer, initialPlayer(0));
  const ref = useRef<HTMLAudioElement>(null);
  const duration = state.duration || (knownMs ?? 0) / 1000;
  const start = (el: HTMLAudioElement) => {
    if (state.status === 'ended') el.currentTime = 0;
    el.play().catch(() => dispatch({ type: 'failed' }));
  };
  const stop = (el: HTMLAudioElement) => el.pause();
  return {
    state,
    duration,
    media: {
      ref,
      onLoadedMetadata: (e) => dispatch({ type: 'loaded', duration: lengthOf(e.currentTarget) }),
      onTimeUpdate: (e) => dispatch({ type: 'time', position: e.currentTarget.currentTime }),
      onPlay: () => dispatch({ type: 'play' }),
      onPause: () => dispatch({ type: 'pause' }),
      onEnded: () => dispatch({ type: 'ended' }),
      onError: () => dispatch({ type: 'failed' }),
    },
    toggle: () => {
      const el = ref.current;
      if (el) (state.status === 'playing' ? stop : start)(el);
    },
    seek: (position) => {
      const el = ref.current;
      if (el) el.currentTime = position;
      dispatch({ type: 'seek', position });
    },
  };
}
