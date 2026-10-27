/**
 * The channel's lifetime around the app's visibility (owner 2026-10-27: close the connection when it is
 * not needed, no leaks). resume() joins (or keeps the joined channel and resyncs once); pause(ms) leaves
 * after `ms` unless resumed first (0 leaves at once); end() leaves for good. At most one connection and
 * one timer at any moment, none after a leave or the end.
 */
export interface LiveSession {
  resume(): void;
  pause(afterMs: number): void;
  end(): void;
}

/** `open` joins and returns its stop (connectInboxLive); `resync` re-reads what is on screen. */
export function createLiveSession(open: () => () => void, resync: () => void): LiveSession {
  let stop: (() => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let ended = false;
  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const leave = () => {
    clear();
    stop?.();
    stop = null;
  };
  return {
    resume() {
      clear();
      if (ended) return;
      // Still joined (a short pause): one resync; a fresh join resyncs itself on SUBSCRIBED.
      if (stop) resync();
      else stop = open();
    },
    pause(afterMs) {
      clear();
      if (!stop) return;
      if (afterMs <= 0) leave();
      else timer = setTimeout(leave, afterMs);
    },
    end() {
      ended = true;
      leave();
    },
  };
}
