import { meetingRoomRoutes } from '@ab/schedule';
import { callWith, type ApiClient } from '../../../core/http';
import type { MeetingCalls } from './meeting-calls.types';

/** Internal meetings on the signed-in api client; answers parsed strictly. */
export function meetingCalls(client: ApiClient): MeetingCalls {
  const call = callWith(client);
  return {
    create: (body) => call({ route: meetingRoomRoutes.create, body }),
    list: () => call({ route: meetingRoomRoutes.list }),
    byLink: (token) => call({ route: meetingRoomRoutes.byLink, params: { token } }),
    end: (id) => call({ route: meetingRoomRoutes.end, params: { id } }),
    newLink: (id) => call({ route: meetingRoomRoutes.newLink, params: { id } }),
    join: (id) => call({ route: meetingRoomRoutes.join, params: { id } }),
    remove: ({ meetingId, identity }) =>
      call({ route: meetingRoomRoutes.remove, params: { id: meetingId, identity } }),
  };
}
