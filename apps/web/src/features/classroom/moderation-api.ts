import type { LessonRecordingView } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/api';
import { CLASSROOM_KEY } from './api';

const ROOM_PREFIX = 'lesson-';

/** The lesson id behind a room name (`lesson-<id>`, shared lessonRoomName); null for any other room. */
export function lessonIdOfRoom(room: string): string | null {
  return room.startsWith(ROOM_PREFIX) && room.length > ROOM_PREFIX.length ? room.slice(ROOM_PREFIX.length) : null;
}

/**
 * POST /lessons/:id/room/participants/:identity/remove: «إخراج من الحلقة» (204). 403 cannot_remove,
 * 404 participant_not_found; afterwards the API refuses their joins with removed_from_room.
 */
export const removeParticipant = ({ lessonId, identity }: { lessonId: string; identity: string }) =>
  apiSend('POST', `/lessons/${lessonId}/room/participants/${encodeURIComponent(identity)}/remove`);

/** GET /lessons/:id/recordings (admin, the lesson's teacher): newest first as the API sends them. */
export const recordingsQuery = (lessonId: string) =>
  queryOptions({
    queryKey: [...CLASSROOM_KEY, 'recordings', lessonId],
    queryFn: () => apiFetch<LessonRecordingView[]>(`/lessons/${lessonId}/recordings`),
  });
