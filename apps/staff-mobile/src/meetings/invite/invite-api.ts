import { meetingCalls, meetingInviteCalls } from '@ab/client-core';
import type { CreateMeeting, UpdateMeeting } from '@ab/schedule';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';

// Scheduled meetings and invitations (R-MEET-01..03). Every key sits under ['meetings'], so a
// create, a reschedule or a cancel refreshes the list.

const meetings = meetingCalls({ apiFetch, apiSend });
const invites = meetingInviteCalls({ apiFetch, apiSend });

/** Instant (no startsAt) or scheduled, with invitees; clientRequestId makes a retry safe. */
export const createMeetingWith = (body: CreateMeeting) => meetings.create(body);

/** Creator or admin: a new time and/or length. 204. */
export const updateMeeting = (input: { id: string; body: UpdateMeeting }) => invites.update(input);

/** Creator or admin: the invitees' links stop working. 204. */
export const cancelMeeting = (id: string) => invites.cancel(id);

/** Staff by name and role, students by name and code (never a phone). */
export const useInviteeOptions = (q: string) =>
  useQuery({
    queryKey: [...pathKey('/meetings/invitee-options'), q],
    queryFn: () => invites.options(q),
  });
