import { meetingCalls } from '@ab/client-core';
import type {
  CreateMeeting,
  MeetingInviteeOption,
  UpdateMeeting,
} from '@ab/schedule';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiSend, toQueryString, pathKey } from '@ab/mobile-kit';

// Scheduled meetings and invitations (R-MEET-01..03). Every key sits under ['meetings'], so a
// create, a reschedule or a cancel refreshes the list.

/** POST /meetings: instant (no startsAt) or scheduled, with invitees; clientRequestId makes a retry safe. */
const meetings = meetingCalls({ apiFetch, apiSend });

export const createMeetingWith = (body: CreateMeeting) => meetings.create(body);

/** PATCH /meetings/:id (creator or admin): a new time and/or length. 204. */
export const updateMeeting = ({ id, body }: { id: string; body: UpdateMeeting }) => apiSend('PATCH', `/meetings/${id}`, body);

/** POST /meetings/:id/cancel (creator or admin): the invitees' links stop working. 204. */
export const cancelMeeting = (id: string) => apiSend('POST', `/meetings/${id}/cancel`);

/** GET /meetings/invitee-options?q=: staff by name and role, students by name and code (never a phone). */
export const useInviteeOptions = (q: string) =>
  useQuery({
    queryKey: [...pathKey('/meetings/invitee-options'), q],
    queryFn: () => apiFetch<MeetingInviteeOption[]>(`/meetings/invitee-options${toQueryString({ q })}`),
  });
