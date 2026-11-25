import type { MuteSource } from '@ab/schedule';

/**
 * The host's writes for one lesson room, injected by the app that may use them (the staff app:
 * lessonRoomSends); the family app mounts the room without them (a read-only participants list).
 */
export interface RoomHost {
  mute: (input: { identity: string; source: MuteSource }) => Promise<void>;
  /** Rejects with the first refusal. */
  muteAll: (identities: readonly string[]) => Promise<void>;
  remove: (identity: string) => Promise<void>;
  /** DeleteRoom: every later join answers 410 lesson_ended. */
  end: () => Promise<unknown>;
}
