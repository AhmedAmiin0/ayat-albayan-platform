import type { RouteBody, RouteResult } from '@ab/core';
import type { meetingInviteRoutes, meetingRoomRoutes } from '@ab/schedule';

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

type Invites = typeof meetingInviteRoutes;
type InviteAnswer<K extends keyof Invites> = Promise<RouteResult<Invites[K]>>;

export interface MeetingInviteResend {
  meetingId: string;
  inviteeId: string;
  /** One per click: a retry reuses it, so a queued text is sent once. */
  clientRequestId: string;
}

/** Scheduled meetings and their invitees, for the creator or an admin. */
export interface MeetingInviteCalls {
  /** Staff by name and role, students by name and code; never a phone. */
  options: (q: string) => InviteAnswer<'inviteeOptions'>;
  update: (input: { id: string; body: RouteBody<Invites['update']> }) => Promise<void>;
  /** The invitees' personal links stop working. */
  cancel: (meetingId: string) => Promise<void>;
  invitees: (meetingId: string) => InviteAnswer<'invitees'>;
  add: (input: { id: string } & RouteBody<Invites['add']>) => InviteAnswer<'add'>;
  resend: (input: MeetingInviteResend) => InviteAnswer<'resend'>;
}
