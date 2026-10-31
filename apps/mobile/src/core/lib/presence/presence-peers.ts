import type { PresenceWatch } from '@ab/client-core';
import { isOnline, type PresencePeer } from '@ab/shared';

/** One person's or a chat's status: online now, else the newest last seen (null: never). */
interface PeerStatus {
  online: boolean;
  lastSeenAt: string | null;
}

/** Is this peer online: present on a live watch, else active a moment ago (isOnline). */
export const peerOnline = (peer: PresencePeer, at: { watch: PresenceWatch; now: Date }): boolean =>
  isOnline({
    live: at.watch.live,
    present: at.watch.online.has(peer.profile_id),
    lastSeenAt: peer.last_seen_at,
    now: at.now,
  });

/** Newest first; never seen (null) last. */
export const byLastSeen = (a: string | null, b: string | null): number =>
  (b ? Date.parse(b) : -Infinity) - (a ? Date.parse(a) : -Infinity) || 0;

/** A chat header's line: online if any peer is, else the newest last seen among them. */
export function chatStatus(
  peers: readonly PresencePeer[],
  at: { watch: PresenceWatch; now: Date },
): PeerStatus {
  const online = peers.some((p) => peerOnline(p, at));
  const newest = peers.map((p) => p.last_seen_at).sort(byLastSeen)[0] ?? null;
  return { online, lastSeenAt: newest };
}
