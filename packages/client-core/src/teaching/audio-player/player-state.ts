import { clampPosition, skipBy, SKIP_SECONDS, type PlayerSpeed } from './player-math';

// The player's state as one reducer: the web <audio> and the mobile AudioSource both report what
// the media did (loaded, time, ended) and the buttons ask for what the listener wants.

export type PlayerStatus = 'loading' | 'paused' | 'playing' | 'ended' | 'failed';

export interface PlayerState {
  status: PlayerStatus;
  position: number;
  duration: number;
  speed: PlayerSpeed;
}

export type PlayerEvent =
  | { type: 'loaded'; duration: number }
  | { type: 'time'; position: number }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'ended' }
  | { type: 'failed' }
  | { type: 'skip'; direction: 1 | -1 }
  | { type: 'seek'; position: number }
  | { type: 'speed'; speed: PlayerSpeed };

/** A new player, at the saved stop. */
export const initialPlayer = (startAt = 0): PlayerState => ({
  status: 'loading',
  position: startAt,
  duration: 0,
  speed: 1,
});

type Step<E extends PlayerEvent['type']> = (
  s: PlayerState,
  e: Extract<PlayerEvent, { type: E }>,
) => PlayerState;
type Steps = { [E in PlayerEvent['type']]: Step<E> };

const STEPS: Steps = {
  loaded: (s, e) => ({ ...s, status: 'paused', duration: e.duration }),
  time: (s, e) => ({ ...s, position: clampPosition(e.position, s.duration) }),
  play: (s) => ({ ...s, status: 'playing' }),
  pause: (s) => ({ ...s, status: 'paused' }),
  ended: (s) => ({ ...s, status: 'ended', position: s.duration }),
  failed: (s) => ({ ...s, status: 'failed' }),
  skip: (s, e) => {
    const delta = e.direction * SKIP_SECONDS;
    return { ...s, position: skipBy({ position: s.position, duration: s.duration, delta }) };
  },
  seek: (s, e) => ({ ...s, position: clampPosition(e.position, s.duration) }),
  speed: (s, e) => ({ ...s, speed: e.speed }),
};

export function playerReducer(state: PlayerState, event: PlayerEvent): PlayerState {
  // TypeScript cannot pair a union member with its own key's step; the map above is checked.
  const step = STEPS[event.type] as Step<PlayerEvent['type']>;
  return step(state, event);
}
