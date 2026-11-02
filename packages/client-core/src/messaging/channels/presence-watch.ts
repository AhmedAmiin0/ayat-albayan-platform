import { PRESENCE_WATCH_MAX } from '@ab/shared';
import {
  afterAuth,
  hasMeta,
  type PresenceChannelLike,
  type PresenceRealtimeLike,
  presenceTopic,
  type PresenceWatch,
} from './presence-live.js';

/**
 * The watch's identity: the first PRESENCE_WATCH_MAX distinct people (the caller's priority),
 * sorted, so the same people in another order (a list re-sorted by last seen) keep the same
 * subscriptions.
 */
export const presenceWatchKey = (profileIds: readonly string[]): string =>
  [...new Set(profileIds)].filter(Boolean).slice(0, PRESENCE_WATCH_MAX).sort().join(',');

interface WatchInput {
  /** The people shown (at most PRESENCE_WATCH_MAX, @ab/shared). */
  profileIds: readonly string[];
  onChange: (watch: PresenceWatch) => void;
}

/**
 * Subscribes (never tracks) to each person's topic; reports who holds a meta, and `live` once every
 * topic joined. A refused or failed join leaves `live` false (the apps fall back to last seen).
 */
export function watchPresence(client: PresenceRealtimeLike, input: WatchInput): () => void {
  let stopped = false;
  const channels = new Map<string, PresenceChannelLike>();
  const joined = new Set<string>();
  const online = new Set<string>();
  const ids = [...new Set(input.profileIds)].filter(Boolean);
  const emit = () => {
    if (stopped) return;
    input.onChange({ live: ids.length > 0 && joined.size === ids.length, online: new Set(online) });
  };
  const join = (id: string) => {
    const channel = client.channel(presenceTopic(id), { config: { private: true } });
    channel.on('presence', { event: 'sync' }, () => {
      if (hasMeta(channel)) online.add(id);
      else online.delete(id);
      emit();
    });
    channels.set(id, channel);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') joined.add(id);
      else joined.delete(id);
      emit();
    });
  };
  const start = () => {
    if (stopped) return;
    try {
      ids.forEach(join);
    } catch {
      emit();
    }
  };
  afterAuth(client, start);
  return () => {
    stopped = true;
    for (const channel of channels.values())
      void client.removeChannel(channel).catch(() => undefined);
    channels.clear();
  };
}
