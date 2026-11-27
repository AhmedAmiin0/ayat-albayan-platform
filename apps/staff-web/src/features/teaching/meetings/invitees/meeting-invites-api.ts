import { meetingCalls, meetingInviteCalls, type MeetingInviteResend } from '@ab/client-core';
import type { CreateMeeting, MeetingInviteeInput, UpdateMeeting } from '@ab/schedule';
import { queryOptions } from '@tanstack/react-query';
import { errorCode } from '@/features/teaching/schedule';
import { apiFetch, apiSend, t } from '@ab/web-kit';
import { meetingKeys } from '@/features/teaching/meetings/internal/meeting.keys';

// Scheduled meetings and invitations (R-MEET-01..03).

const invites = meetingInviteCalls({ apiFetch, apiSend });

/** POST /meetings: instant (no startsAt) or scheduled; one result per invitee. */
export const createMeetingWith = (body: CreateMeeting) =>
  meetingCalls({ apiFetch, apiSend }).create(body);

/** Creator or admin: a new time and/or duration. */
export const updateMeeting = (input: { id: string; body: UpdateMeeting }) => invites.update(input);

/** Creator or admin: 204; the invitees' links stop working. */
export const cancelMeeting = (id: string) => invites.cancel(id);

/** Creator or admin: never a phone. */
export const meetingInviteesQuery = (id: string) =>
  queryOptions({
    queryKey: meetingKeys.invitees(id),
    queryFn: () => invites.invitees(id),
  });

/** More invitees on an existing meeting. */
export const addMeetingInvitees = (input: { id: string; invitees: MeetingInviteeInput[] }) =>
  invites.add(input);

/**
 * A new personal link and invitation text. The caller keeps one clientRequestId per click (a
 * retry reuses it, rule 8): a retried id whose text was already queued sends nothing again; one
 * that queued nothing returns a fresh link.
 */
export const resendInvite = (v: MeetingInviteResend) => invites.resend(v);

/** Staff by name and role, students by name and code. */
export const inviteeOptionsQuery = (q: string) =>
  queryOptions({
    queryKey: meetingKeys.inviteeOptions(q),
    queryFn: () => invites.options(q),
    staleTime: 30_000,
  });

const ERRORS: Record<string, string | undefined> = t.meetingInvites.errors;
const EXTRA: Record<string, string> = { meeting_ended: t.classroom.error.meeting_ended };

/** The line for a failed meeting command: its own wording when the code has one, else `fallback`. */
export function meetingErrorText(
  error: unknown,
  fallback: string = t.meetingInvites.error,
): string {
  const code = errorCode(error) ?? '';
  return ERRORS[code] ?? EXTRA[code] ?? fallback;
}
