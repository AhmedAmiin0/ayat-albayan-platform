import type { LiveConnection } from './live-connect.js';

/**
 * The channel's lifetime around the app's visibility (owner 2026-10-27: close the connection when
 * it is not needed, no leaks). resume() joins (or keeps the joined channel, rejoins it at once if it
 * dropped, and resyncs once); pause(ms) leaves after `ms` unless resumed first (0 leaves at once);
 * end() leaves for good. At most one connection and
 * one timer at any moment, none after a leave or the end.
 */
export interface LiveSession {
  resume(): void;
  pause(afterMs: number): void;
  end(): void;
}

/** `open` joins and returns the connection (connectInboxLive); `resync` re-reads what is shown. */
export function createLiveSession(open: () => LiveConnection, resync: () => void): LiveSession {
  let conn: LiveConnection | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let ended = false;
  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const leave = () => {
    clear();
    conn?.stop();
    conn = null;
  };
  return {
    resume() {
      clear();
      if (ended) return;
      // Still joined (a short pause): a dropped channel rejoins now, one resync; a fresh join
      // resyncs itself on SUBSCRIBED.
      if (!conn) {
        conn = open();
        return;
      }
      conn.retryNow();
      resync();
    },
    pause(afterMs) {
      clear();
      if (!conn) return;
      if (afterMs <= 0) leave();
      else timer = setTimeout(leave, afterMs);
    },
    end() {
      ended = true;
      leave();
    },
  };
}
