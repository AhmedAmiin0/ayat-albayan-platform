import { isOnline, type PresencePeer } from '@ab/shared';
import type { PresenceWatch } from '@ab/client-core';

/** A person shown with presence: the API's row plus «online now» on the viewer's clock. */
export type WithOnline<T extends PresencePeer> = T & { online: boolean };

/** Online per person: present on a live socket, else active within the last two minutes. */
export function withOnline<T extends PresencePeer>(
  rows: readonly T[],
  { watch, now }: { watch: PresenceWatch; now: Date },
): WithOnline<T>[] {
  return rows.map((row) => {
    const present = watch.online.has(row.profile_id);
    const online = isOnline({ live: watch.live, present, lastSeenAt: row.last_seen_at, now });
    return { ...row, online };
  });
}

const seenAt = (row: PresencePeer): number =>
  row.last_seen_at ? Date.parse(row.last_seen_at) || 0 : 0;

/** Online first, then the newest last seen; never seen last. */
export const byPresence = (a: WithOnline<PresencePeer>, b: WithOnline<PresencePeer>): number =>
  Number(b.online) - Number(a.online) || seenAt(b) - seenAt(a);

/** The list in presence order (a new array). */
export const presenceOrder = <T extends PresencePeer>(rows: readonly WithOnline<T>[]) =>
  [...rows].sort(byPresence);

/** The chat header's one person: anyone online, else the most recently seen. */
export const bestPeer = <T extends PresencePeer>(rows: readonly WithOnline<T>[]) =>
  presenceOrder(rows)[0];
