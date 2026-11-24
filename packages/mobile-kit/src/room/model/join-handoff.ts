import { chatOpen, type RoomJoinResult } from '@ab/schedule';
import type { RoomCredentials, RoomTarget } from './room-types';

// The token the press already fetched, handed to the room screen in memory: never a route param, a
// log or the query cache. Read once (take), so a stale token is never reused; the screen asks the
// API again then.
const pending = new Map<string, RoomCredentials>();

/** One key per room. */
const targetKey = (target: RoomTarget): string => `${target.kind}:${target.id}`;

/** What the room keeps of the join answer: the connection, one's role, the chat (trial: off). */
export const credentialsOf = (join: RoomJoinResult): RoomCredentials => ({
  url: join.url,
  token: join.token,
  role: join.role,
  chat: chatOpen(join),
});

export function handOff(target: RoomTarget, join: RoomJoinResult): void {
  pending.set(targetKey(target), credentialsOf(join));
}

export function takeHandoff(target: RoomTarget): RoomCredentials | null {
  const key = targetKey(target);
  const join = pending.get(key) ?? null;
  pending.delete(key);
  return join;
}
