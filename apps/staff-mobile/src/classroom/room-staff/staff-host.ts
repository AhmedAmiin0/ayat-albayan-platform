import { lessonRoomSends } from '@ab/client-core';
import type { RoomKind, RoomTarget, RoomHost } from '@ab/mobile-kit/room';
import { apiFetch, apiSend } from '@ab/mobile-kit';

function lessonHost(lessonId: string): RoomHost {
  const sends = lessonRoomSends({ apiFetch, apiSend });
  return {
    mute: ({ identity, source }) => sends.mute({ lessonId, identity, source }),
    muteAll: (identities) => sends.muteAll({ lessonId, identities }),
    remove: (identity) => sends.remove({ lessonId, identity }),
    end: () => sends.end(lessonId),
  };
}

const HOSTS: Record<RoomKind, (id: string) => RoomHost | null> = {
  lesson: lessonHost,
  // A meeting has its own end action on its page; the room offers the list only.
  meeting: () => null,
};

/** The staff app's host writes for this room (the API decides per role again). */
export const staffHost = (target: RoomTarget): RoomHost | null => HOSTS[target.kind](target.id);
