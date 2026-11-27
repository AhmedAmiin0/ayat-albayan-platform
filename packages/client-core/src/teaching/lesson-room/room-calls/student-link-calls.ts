import { lessonRoomRoutes } from '@ab/schedule';
import { callWith, type ApiClient } from '../../../core/http';
import type { StudentLinkCalls } from './room-calls.types';

/** The student's page on a public api client; answers parsed strictly. */
export function studentLinkCalls(client: ApiClient): StudentLinkCalls {
  const call = callWith(client);
  return {
    view: (token) => call({ route: lessonRoomRoutes.studentLink, params: { token } }),
  };
}
