import { lessonRoomName, meetingRoomName } from '@ab/shared';

/** What a recording belongs to: a lesson's room or an internal meeting's. */
export interface RoomTarget {
  kind: 'lesson' | 'meeting';
  id: string;
}

export const lessonTarget = (id: string): RoomTarget => ({ kind: 'lesson', id });
export const meetingTarget = (id: string): RoomTarget => ({ kind: 'meeting', id });

/** The LiveKit room: `lesson-<id>` or `meeting-<id>`. */
export const roomNameOf = (t: RoomTarget): string => (t.kind === 'lesson' ? lessonRoomName(t.id) : meetingRoomName(t.id));

const ROOM = /^(lesson|meeting)-([0-9a-f-]{36})$/;

/** The target behind a LiveKit room name; null for any room the API did not name. */
export function targetOfRoom(room: string | null | undefined): RoomTarget | null {
  const m = ROOM.exec(room ?? '');
  if (!m?.[2]) return null;
  return { kind: m[1] === 'meeting' ? 'meeting' : 'lesson', id: m[2] };
}

/** The recordings row's owner column. */
export const ownerColumns = (t: RoomTarget): { lesson_id: string } | { meeting_id: string } =>
  t.kind === 'lesson' ? { lesson_id: t.id } : { meeting_id: t.id };
