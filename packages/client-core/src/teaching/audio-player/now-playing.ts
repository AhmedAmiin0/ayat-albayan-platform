// One player sounds at a time (recordings spec §6); starting one stops the previous.

export interface NowPlaying {
  subscribe: (listener: () => void) => () => void;
  /** The id (a recording's or a voice note's) that plays now, else null. */
  current: () => string | null;
  /** `id` starts playing: the player before it is stopped through its own `stop`. */
  claim: (player: { id: string; stop: () => void }) => void;
  /** `id` paused, ended or left the page: nothing plays now, unless another took over. */
  release: (id: string) => void;
}

interface Player {
  id: string;
  stop: () => void;
}

export function nowPlayingStore(): NowPlaying {
  let playing: Player | null = null;
  const listeners = new Set<() => void>();
  const notify = (): void => {
    for (const listener of listeners) listener();
  };
  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    current: () => playing?.id ?? null,
    claim: (player) => {
      const before = playing;
      playing = player;
      if (before && before.id !== player.id) before.stop();
      notify();
    },
    release: (id) => {
      if (playing?.id !== id) return;
      playing = null;
      notify();
    },
  };
}
