import { classroomUrl, meetingUrl } from '@/classroom/links/web-origin';
import type { RoomKind, RoomTarget } from '@ab/mobile-kit/room';

const KINDS: readonly RoomKind[] = ['lesson', 'meeting'];

/** The join endpoint the web room uses too (no new route): it answers {url, token, room, role}. */
export const joinPath = (target: RoomTarget): string =>
  target.kind === 'lesson' ? `/lessons/${target.id}/room/join` : `/meetings/${target.id}/join`;

/** Used for open-in-browser, and as the path when the app cannot hold the room. */
export const roomWebUrl = (target: RoomTarget): string =>
  target.kind === 'lesson' ? classroomUrl(target.id) : meetingUrl(target.id);

/** From the lesson-started push there is no preview. */
export interface RoomEntry {
  direct?: boolean;
  /** The first student, whose channel is the in-room chat. */
  studentId?: string | undefined;
}

/** The app's full-screen room route (app/room/[kind]/[id].tsx), with its entry as the query. */
export function roomRoute(target: RoomTarget, entry: RoomEntry = {}): string {
  const query = [
    entry.direct ? 'direct=1' : null,
    entry.studentId ? `student=${encodeURIComponent(entry.studentId)}` : null,
  ].filter((x) => x !== null);
  const base = `/room/${target.kind}/${target.id}`;
  return query.length > 0 ? `${base}?${query.join('&')}` : base;
}

/** The route's params back to a target; null for anything else (a hand-typed or stale link). */
export function parseTarget(kind: unknown, id: unknown): RoomTarget | null {
  const k = KINDS.find((x) => x === kind);
  if (!k || typeof id !== 'string' || !/^[0-9a-f-]{8,64}$/i.test(id)) return null;
  return { kind: k, id };
}
