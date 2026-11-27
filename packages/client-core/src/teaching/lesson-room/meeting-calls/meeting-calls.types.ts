import type { RouteBody, RouteResult } from '@ab/core';
import type { meetingRoomRoutes } from '@ab/schedule';

type Routes = typeof meetingRoomRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export interface MeetingParticipant {
  meetingId: string;
  identity: string;
}

/** Internal meetings, staff side; the app keeps its own query keys. */
export interface MeetingCalls {
  create: (body: RouteBody<Routes['create']>) => Answer<'create'>;
  list: () => Answer<'list'>;
  /** The meeting behind a shared /m/<token> link, for a signed-in staff member. */
  byLink: (token: string) => Answer<'byLink'>;
  end: (meetingId: string) => Promise<void>;
  /** A fresh link; the previous one stops working. */
  newLink: (meetingId: string) => Answer<'newLink'>;
  join: (meetingId: string) => Answer<'join'>;
  /** Disconnects someone (no lasting block); 403 cannot_remove, 404 participant_not_found. */
  remove: (who: MeetingParticipant) => Promise<void>;
}

export interface GuestMeetingJoin {
  linkToken: string;
  name: string;
}

/** The link's door with no login, on a public api client. */
export interface PublicMeetingCalls {
  view: (linkToken: string) => Answer<'publicView'>;
  join: (input: GuestMeetingJoin) => Answer<'guestJoin'>;
}
