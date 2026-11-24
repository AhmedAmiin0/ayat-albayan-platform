import { lessonEndResultSchema, type LessonEndResult, type MuteSource } from '@ab/schedule';
import type { ApiClient } from '../../core/http/index.js';

// The lesson room's host controls for web and both apps (owner 2026-11-16): «إنهاء الحلقة للجميع»,
// per-participant «كتم الميكروفون» / «إيقاف الكاميرا» / «إخراج», and «كتم الجميع» (the per-person
// mute for every guest microphone that is on, as the web host does). The API decides who may.

const enc = encodeURIComponent;
const lessonPath = (lessonId: string) => `/lessons/${enc(lessonId)}`;
const participantPath = (lessonId: string, identity: string) =>
  `${lessonPath(lessonId)}/room/participants/${enc(identity)}`;

/** POST: the teacher of the lesson or an admin ends it for everyone (idempotent): { endedAt }. */
export const lessonEndPath = (lessonId: string): string => `${lessonPath(lessonId)}/end`;
/** POST { source }: 204; 403 cannot_mute, 404 participant_not_found. */
export const lessonMutePath = (lessonId: string, identity: string): string =>
  `${participantPath(lessonId, identity)}/mute`;
/** POST: 204; the person (every link and window of theirs) is kept out of this lesson's room. */
export const lessonRemovePath = (lessonId: string, identity: string): string =>
  `${participantPath(lessonId, identity)}/remove`;

export interface RoomTargetInput {
  lessonId: string;
  identity: string;
}

export interface LessonRoomSends {
  end: (lessonId: string) => Promise<LessonEndResult>;
  mute: (input: RoomTargetInput & { source: MuteSource }) => Promise<void>;
  /** «كتم الجميع»: every identity's microphone; rejects with the first refusal. */
  muteAll: (input: { lessonId: string; identities: readonly string[] }) => Promise<void>;
  remove: (input: RoomTargetInput) => Promise<void>;
}

export function lessonRoomSends(client: ApiClient): LessonRoomSends {
  const mute: LessonRoomSends['mute'] = ({ lessonId, identity, source }) =>
    client.apiSend('POST', lessonMutePath(lessonId, identity), { source });
  const ended = async (lessonId: string): Promise<unknown> =>
    client.apiSend('POST', lessonEndPath(lessonId));
  return {
    end: async (lessonId) =>
      lessonEndResultSchema.parse(await ended(lessonId)),
    mute,
    muteAll: async ({ lessonId, identities }) => {
      const calls = identities.map((identity) =>
        mute({ lessonId, identity, source: 'microphone' }),
      );
      const failed = (await Promise.allSettled(calls)).find((r) => r.status === 'rejected');
      if (failed) throw failed.reason;
    },
    remove: ({ lessonId, identity }) =>
      client.apiSend('POST', lessonRemovePath(lessonId, identity)),
  };
}
