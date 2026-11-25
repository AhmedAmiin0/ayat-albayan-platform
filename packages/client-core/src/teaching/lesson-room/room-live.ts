import type { LessonRoomState } from '@ab/schedule';

const MIN_MS = 60_000;

/** Someone is inside and the lesson was not ended for everyone. */
export const isRoomLive = (room: LessonRoomState | null | undefined): boolean =>
  !!room && room.endedAt === null && room.liveSince !== null && room.inRoom.length > 0;

/** Whole minutes since the room went live (0 in its first minute); null when it is not live. */
export function roomLiveMinutes(
  room: LessonRoomState | null | undefined,
  now: Date,
): number | null {
  if (!room || !isRoomLive(room) || room.liveSince === null) return null;
  return Math.max(0, Math.floor((now.getTime() - Date.parse(room.liveSince)) / MIN_MS));
}

/** True when the family is inside and the teacher is not. */
export const studentWaiting = (room: LessonRoomState | null | undefined): boolean =>
  isRoomLive(room) &&
  !!room?.inRoom.some((p) => p.role === 'student' || p.role === 'guardian') &&
  !room.inRoom.some((p) => p.role === 'teacher');

/** Ended for everyone, with no way back in. */
export const roomEndedFor = (room: LessonRoomState | null | undefined): boolean =>
  typeof room?.endedAt === 'string';
