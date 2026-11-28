import { roomModerationRoutes as routes } from '@ab/schedule';
import { callWith, type ApiClient } from '../../core/http';
import type { LessonRoomSends } from './lesson-room.types';

/** Room host controls for web and both apps; the API decides who may act. */
export function lessonRoomSends(client: ApiClient): LessonRoomSends {
  const call = callWith(client);
  const mute: LessonRoomSends['mute'] = ({ lessonId, identity, source }) =>
    call({ route: routes.muteInLesson, params: { id: lessonId, identity }, body: { source } });
  return {
    end: (lessonId) => call({ route: routes.endLesson, params: { id: lessonId } }),
    mute,
    muteAll: async ({ lessonId, identities }) => {
      const calls = identities.map((identity) =>
        mute({ lessonId, identity, source: 'microphone' }),
      );
      const failed = (await Promise.allSettled(calls)).find((r) => r.status === 'rejected');
      if (failed) throw failed.reason;
    },
    remove: ({ lessonId, identity }) =>
      call({ route: routes.removeFromLesson, params: { id: lessonId, identity } }),
    share: ({ lessonId, identity, allow }) =>
      call({ route: routes.shareInLesson, params: { id: lessonId, identity }, body: { allow } }),
  };
}
