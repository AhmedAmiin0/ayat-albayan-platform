import { lessonRoomSends, roomModerationApi } from '@ab/client-core';
import type { MuteSource } from '@ab/schedule';
import { apiFetch, apiSend } from '@ab/web-kit/lib/http/api';
import {
  recordingSourceOf,
  type RecordingSource,
} from '@ab/web-kit/classroom/api/moderation-api';

/** Mute one participant's mic or camera: 204, or an ApiError. */
export type MuteCall = (input: { identity: string; source: MuteSource }) => Promise<void>;

type RoomMute = (input: { id: string; identity: string; source: MuteSource }) => Promise<void>;

const lessonRoom = lessonRoomSends({ apiFetch, apiSend });
const meetings = roomModerationApi({ apiFetch, apiSend });

/** The mute route by room kind. */
const MUTE: Record<RecordingSource['kind'], RoomMute> = {
  lesson: ({ id, ...rest }) => lessonRoom.mute({ lessonId: id, ...rest }),
  meeting: ({ id, ...rest }) => meetings.muteInMeeting({ meetingId: id, ...rest }),
};

/** POST …/:identity/mute {source} for this room; null for a room of neither kind. */
export function muteFor(room: string): MuteCall | null {
  const of = recordingSourceOf(room);
  if (of === null) return null;
  const mute = MUTE[of.kind];
  return ({ identity, source }) => mute({ id: of.id, identity, source });
}
