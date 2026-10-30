import type { RoomCredentials, RoomTarget } from './room-types';
import { targetKey } from './join-target';

// The token the press already fetched, handed to the room screen in memory: never a route param, a
// log or the query cache. Read once (take), so a stale token is never reused; the screen asks the
// API again then.
const pending = new Map<string, RoomCredentials>();

export function handOff(target: RoomTarget, join: RoomCredentials): void {
  pending.set(targetKey(target), { url: join.url, token: join.token });
}

export function takeHandoff(target: RoomTarget): RoomCredentials | null {
  const key = targetKey(target);
  const join = pending.get(key) ?? null;
  pending.delete(key);
  return join;
}
