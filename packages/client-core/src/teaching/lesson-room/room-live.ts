import type { LessonRoomState } from '@ab/schedule';

// «الحلقة جارية الآن · منذ ١٢ دقيقة» and «الطالب ينتظرك» from a lesson's `room`
// (lessonRoomStateSchema).

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

/** «الطالب ينتظرك»: the family is inside and the teacher is not. */
export const studentWaiting = (room: LessonRoomState | null | undefined): boolean =>
  isRoomLive(room) &&
  !!room?.inRoom.some((p) => p.role === 'student' || p.role === 'guardian') &&
  !room.inRoom.some((p) => p.role === 'teacher');

/** «انتهت الحلقة»: ended for everyone, no way back in. */
export const roomEndedFor = (room: LessonRoomState | null | undefined): boolean =>
  typeof room?.endedAt === 'string';
