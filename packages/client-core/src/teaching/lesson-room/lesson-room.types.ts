import type { LessonEndResult, MuteSource } from '@ab/schedule';

export interface RoomTargetInput {
  lessonId: string;
  identity: string;
}

export interface LessonRoomSends {
  /** The teacher of the lesson or an admin ends it for everyone (idempotent). */
  end: (lessonId: string) => Promise<LessonEndResult>;
  /** 204; 403 cannot_mute, 404 participant_not_found. */
  mute: (input: RoomTargetInput & { source: MuteSource }) => Promise<void>;
  /** Rejects with the first refusal. */
  muteAll: (input: { lessonId: string; identities: readonly string[] }) => Promise<void>;
  /** 204; the person (every link and window of theirs) is kept out of this lesson's room. */
  remove: (input: RoomTargetInput) => Promise<void>;
  /** 204; 403 cannot_grant_share, 404 participant_not_found. */
  share: (input: RoomTargetInput & { allow: boolean }) => Promise<void>;
}
