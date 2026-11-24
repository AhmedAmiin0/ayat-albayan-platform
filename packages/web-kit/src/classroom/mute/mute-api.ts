import { lessonMutePath } from '@ab/client-core';
import type { MuteSource } from '@ab/shared';
import { apiSend } from '@ab/web-kit/lib/http/api';
import {
  recordingSourceOf,
  type RecordingSource,
} from '@ab/web-kit/classroom/api/moderation-api';

/** Mute one participant's mic or camera: 204, or an ApiError. */
export type MuteCall = (input: { identity: string; source: MuteSource }) => Promise<void>;

/** The mute route by room kind: the lesson's from client-core (as the apps), the meeting's. */
const MUTE_PATH: Record<RecordingSource['kind'], (id: string, identity: string) => string> = {
  lesson: lessonMutePath,
  meeting: (id, identity) => `/meetings/${id}/participants/${encodeURIComponent(identity)}/mute`,
};

/** POST …/:identity/mute {source} for this room; null for a room of neither kind. */
export function muteFor(room: string): MuteCall | null {
  const of = recordingSourceOf(room);
  if (of === null) return null;
  const path = MUTE_PATH[of.kind];
  return ({ identity, source }) => apiSend('POST', path(of.id, identity), { source });
}
