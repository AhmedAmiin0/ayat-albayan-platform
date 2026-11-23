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
  /** 'off': RECORDING_S3_* or LiveKit Egress are not set up, so this room is not recorded (the admin is warned). */
  recording?: 'on' | 'off';
  /** false: a trial lesson: no text chat between the family and the teacher. */
  chat?: boolean;
}

/** The data topic of the in-room text chat: never sent, and dropped on arrival, while chat is off. */
export const CHAT_TOPIC = 'chat';

/** Text chat is open unless the join says it is not (an older API, or a meeting, sends nothing). */
export const chatOpen = (join: Pick<RoomJoinResult, 'chat'>): boolean => join.chat !== false;

/** A data packet on the chat topic while chat is off: not sent, not delivered (the board and requests pass). */
export const dropsChat = (chatOn: boolean, topic: string | undefined): boolean => !chatOn && topic === CHAT_TOPIC;

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
  'lesson_ended',
  'lesson_not_live',
] as const;
export type ClassroomError = (typeof CLASSROOM_ERRORS)[number];

// The family app's signed browser link (/join/<token>, docs/50 §2, §7): 70 url-safe characters,
// where a random lesson link is 32. It names its (lesson, student), so the guest page asks no name
// and the API takes the student's. By shape only: the API verifies the signature.
const FAMILY_TOKEN = /^[A-Za-z0-9_-]{70}$/;

/** Could this /join token be a family join token? (Nothing is verified or read for it.) */
export const looksLikeFamilyToken = (linkToken: string): boolean => FAMILY_TOKEN.test(linkToken);
