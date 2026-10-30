import { classroomUrl, meetingUrl } from '@/classroom/links/web-origin';
import type { RoomKind, RoomTarget } from './room-types';

const KINDS: readonly RoomKind[] = ['lesson', 'meeting'];

/** The join endpoint the web room uses too (no new route): it answers {url, token, room, role}. */
export const joinPath = (target: RoomTarget): string =>
  target.kind === 'lesson' ? `/lessons/${target.id}/room/join` : `/meetings/${target.id}/join`;

/** The web page of the same room: «فتح في المتصفح», and the path when the app cannot hold it. */
export const roomWebUrl = (target: RoomTarget): string =>
  target.kind === 'lesson' ? classroomUrl(target.id) : meetingUrl(target.id);

/** The app's full-screen room route (app/room/[kind]/[id].tsx). */
export const roomRoute = (target: RoomTarget): string => `/room/${target.kind}/${target.id}`;

/** The route's params back to a target; null for anything else (a hand-typed or stale link). */
export function parseTarget(kind: unknown, id: unknown): RoomTarget | null {
  const k = KINDS.find((x) => x === kind);
  if (!k || typeof id !== 'string' || !/^[0-9a-f-]{8,64}$/i.test(id)) return null;
  return { kind: k, id };
}

/** One key per room, for the token handoff. */
export const targetKey = (target: RoomTarget): string => `${target.kind}:${target.id}`;
