import { lessonRemovePath } from '@ab/client-core';
import type { LessonRecordingView, RecordingStatus } from '@ab/schedule';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit/lib/http/api';
import { CLASSROOM_KEY } from './api';

const ROOM_PREFIX = 'lesson-';
const MEETING_PREFIX = 'meeting-';

/** The lesson id behind a room name (`lesson-<id>`, shared lessonRoomName); null for any other room. */
export function lessonIdOfRoom(room: string): string | null {
  return room.startsWith(ROOM_PREFIX) && room.length > ROOM_PREFIX.length
    ? room.slice(ROOM_PREFIX.length)
    : null;
}

/** The internal meeting id behind a room name (`meeting-<id>`, shared meetingRoomName); null for any other room. */
export function meetingIdOfRoom(room: string): string | null {
  return room.startsWith(MEETING_PREFIX) && room.length > MEETING_PREFIX.length
    ? room.slice(MEETING_PREFIX.length)
    : null;
}

/** 403 cannot_remove, 404 participant_not_found; then joins fail with removed_from_room. */
export const removeParticipant = ({ lessonId, identity }: { lessonId: string; identity: string }) =>
  apiSend('POST', lessonRemovePath(lessonId, identity));

/** POST /meetings/:id/participants/:identity/remove: disconnects someone (no lasting block). */
export const removeMeetingParticipant = (who: { meetingId: string; identity: string }) =>
  apiSend('POST', `/meetings/${who.meetingId}/participants/${encodeURIComponent(who.identity)}/remove`);

/** An internal meeting only disconnects, no lasting block; `lessonId` null means no removal. */
export function kickScope(room: string): {
  lessonId: string | null;
  remove?: typeof removeParticipant;
} {
  const meetingId = meetingIdOfRoom(room);
  // A lesson room keeps useKick's default (removeParticipant).
  if (meetingId === null) return { lessonId: lessonIdOfRoom(room) };
  return {
    lessonId: meetingId,
    remove: ({ identity }) => removeMeetingParticipant({ meetingId, identity }),
  };
}

export interface RecordingSource {
  kind: 'lesson' | 'meeting';
  id: string;
}

/**
 * GET /lessons/:id/recordings (admin, the lesson's teacher) or /meetings/:id/recordings (admin, the
 * creator): newest first as the API sends them.
 */
export const recordingsQuery = (source: RecordingSource) =>
  queryOptions({
    queryKey: [...CLASSROOM_KEY, 'recordings', source.kind, source.id],
    queryFn: () => apiFetch<LessonRecordingView[]>(`/${source.kind}s/${source.id}/recordings`),
  });

/** GET /recordings/status: can the server record at all (RECORDING_S3_* + LiveKit)? */
export const recordingStatusQuery = queryOptions({
  queryKey: [...CLASSROOM_KEY, 'recording-status'],
  queryFn: () => apiFetch<RecordingStatus>('/recordings/status'),
  staleTime: 5 * 60_000,
});

/** The recordings of this room: `lesson-<id>` or `meeting-<id>`; null for any other room. */
export function recordingSourceOf(room: string): RecordingSource | null {
  const meetingId = meetingIdOfRoom(room);
  if (meetingId !== null) return { kind: 'meeting', id: meetingId };
  const lessonId = lessonIdOfRoom(room);
  return lessonId === null ? null : { kind: 'lesson', id: lessonId };
}
