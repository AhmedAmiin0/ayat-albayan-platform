import type { MuteSource } from '@ab/shared';

/**
 * The host's writes for one lesson room, injected by the app that may use them (the staff app:
 * lessonRoomSends); the family app mounts the room without them (a read-only participants list).
 */
export interface RoomHost {
  mute: (input: { identity: string; source: MuteSource }) => Promise<void>;
  /** «كتم الجميع»: these microphones; rejects with the first refusal. */
  muteAll: (identities: readonly string[]) => Promise<void>;
  remove: (identity: string) => Promise<void>;
  /** «إنهاء الحلقة للجميع»: DeleteRoom; every later join answers 410 lesson_ended. */
  end: () => Promise<unknown>;
}
