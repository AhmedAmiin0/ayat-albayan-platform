import { meetingInviteRoutes } from '@ab/schedule';
import { callWith, type ApiClient } from '../../../core/http';
import type { MeetingInviteCalls } from './meeting-calls.types';

/** Scheduled meetings and their invitees on the signed-in api client; answers parsed strictly. */
export function meetingInviteCalls(client: ApiClient): MeetingInviteCalls {
  const call = callWith(client);
  return {
    options: (q) =>
      call({ route: meetingInviteRoutes.inviteeOptions, query: q ? { q } : {} }),
    update: ({ id, body }) => call({ route: meetingInviteRoutes.update, params: { id }, body }),
    cancel: (id) => call({ route: meetingInviteRoutes.cancel, params: { id } }),
    invitees: (id) => call({ route: meetingInviteRoutes.invitees, params: { id } }),
    add: ({ id, invitees }) =>
      call({ route: meetingInviteRoutes.add, params: { id }, body: { invitees } }),
    resend: ({ meetingId, inviteeId, clientRequestId }) =>
      call({
        route: meetingInviteRoutes.resend,
        params: { id: meetingId, inviteeId },
        body: { clientRequestId },
      }),
  };
}
