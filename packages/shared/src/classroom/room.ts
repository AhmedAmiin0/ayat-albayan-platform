const PREFIX = 'lesson-';

/** The LiveKit room of a lesson (migration 181: derived, not stored). */
export const lessonRoomName = (lessonId: string): string => `${PREFIX}${lessonId}`;

const MEETING_PREFIX = 'meeting-';

/** The LiveKit room of an internal meeting («اجتماع داخلي», migration 193): derived, not stored. */
export const meetingRoomName = (meetingId: string): string => `${MEETING_PREFIX}${meetingId}`;

/** Who a token was minted for. Staff roles join with their own login, `guest` with a link. */
export const JOIN_ROLES = ['teacher', 'admin', 'assistant', 'sales', 'guest'] as const;
export type JoinRole = (typeof JOIN_ROLES)[number];

/** POST /lessons/:id/room/join and POST /public/join/:linkToken: all the web room needs. */
export interface RoomJoinResult {
  url: string;
  token: string;
  room: string;
  role: JoinRole;
}

/** Stable error codes of the classroom routes (the clients map them to ar/en messages). */
export const CLASSROOM_ERRORS = [
  'classroom_not_configured',
  'join_not_open_yet',
  'join_closed',
  'link_invalid',
  'link_expired',
  'too_many_requests',
  'template_not_approved',
  'lesson_not_found',
  'removed_from_room',
  'participant_not_found',
  'cannot_remove',
  'no_lesson',
  'lesson_not_open',
  'meeting_ended',
  'meeting_not_found',
  'cannot_grant_share',
  'cannot_mute',
] as const;
export type ClassroomError = (typeof CLASSROOM_ERRORS)[number];
