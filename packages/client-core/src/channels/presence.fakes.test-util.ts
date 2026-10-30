import type { PresenceChannelLike, PresenceRealtimeLike } from './presence-live.js';

/** A fake realtime client: records joins, tracks and leaves; tests drive status and state. */
export interface FakeChannel extends PresenceChannelLike {
  topic: string;
  config: { private: boolean; presence?: { key: string } };
  tracked: Record<string, unknown>[];
  status: (s: string) => void;
  sync: (state: Record<string, unknown[]>) => void;
}

export function fakeRealtime(): PresenceRealtimeLike & {
  joined: FakeChannel[];
  removed: FakeChannel[];
} {
  const joined: FakeChannel[] = [];
  const removed: FakeChannel[] = [];
  const client = {
    joined,
    removed,
    channel(topic: string, options: { config: FakeChannel['config'] }) {
      let state: Record<string, unknown[]> = {};
      let onSync: () => void = () => undefined;
      let onStatus: (s: string) => void = () => undefined;
      const ch: FakeChannel = {
        topic,
        config: options.config,
        tracked: [],
        on: (_type, _filter, cb) => {
          onSync = cb;
          return ch;
        },
        subscribe: (cb) => {
          if (cb) onStatus = cb;
          return ch;
        },
        presenceState: () => state,
        track: (payload) => {
          ch.tracked.push(payload);
          return Promise.resolve('ok');
        },
        status: (s) => {
          onStatus(s);
        },
        sync: (next) => {
          state = next;
          onSync();
        },
      };
      joined.push(ch);
      return ch;
    },
    removeChannel(ch: PresenceChannelLike) {
      removed.push(ch as FakeChannel);
      return Promise.resolve('ok');
    },
  };
  return client;
}
