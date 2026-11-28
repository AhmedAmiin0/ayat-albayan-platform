import { lessonRoomSends, roomModerationApi } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/web-kit/lib/http/api';
import {
  recordingSourceOf,
  type RecordingSource,
} from '@ab/web-kit/classroom/api/moderation-api';

/** Allow or stop one guest's screen share: 204, or an ApiError. */
export type GrantShare = (input: { identity: string; allow: boolean }) => Promise<void>;

type RoomShare = (input: { id: string; identity: string; allow: boolean }) => Promise<void>;

const lessonRoom = lessonRoomSends({ apiFetch, apiSend });
const meetings = roomModerationApi({ apiFetch, apiSend });

const SHARE: Record<RecordingSource['kind'], RoomShare> = {
  lesson: ({ id, ...rest }) => lessonRoom.share({ lessonId: id, ...rest }),
  meeting: ({ id, ...rest }) => meetings.shareInMeeting({ meetingId: id, ...rest }),
};

/** POST …/:identity/share {allow} for this room; null for a room of neither kind. */
export function grantShareFor(room: string): GrantShare | null {
  const of = recordingSourceOf(room);
  if (of === null) return null;
  const share = SHARE[of.kind];
  return ({ identity, allow }) => share({ id: of.id, identity, allow });
}
