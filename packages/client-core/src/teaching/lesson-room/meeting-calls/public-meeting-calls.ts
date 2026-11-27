import { meetingRoomRoutes } from '@ab/schedule';
import { callWith, type ApiClient } from '../../../core/http';
import type { PublicMeetingCalls } from './meeting-calls.types';

/** The guest page of a meeting link on a public api client; answers parsed strictly. */
export function publicMeetingCalls(client: ApiClient): PublicMeetingCalls {
  const call = callWith(client);
  return {
    view: (token) => call({ route: meetingRoomRoutes.publicView, params: { token } }),
    join: ({ linkToken, name }) =>
      call({ route: meetingRoomRoutes.guestJoin, params: { token: linkToken }, body: { name } }),
  };
}
