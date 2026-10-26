import type {
  CreateMeeting,
  MeetingCreateResult,
  MeetingInviteeInput,
  MeetingInviteeOption,
  MeetingInviteeView,
  MeetingInviteResult,
  UpdateMeeting,
} from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { errorCode } from '@/features/teaching/schedule/api';
import { apiFetch, apiSend } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { MEETINGS_KEY } from '../internal/internal-api';

// Scheduled meetings and invitations (R-MEET-01..03, owner 2026-10-12): POST /meetings with a time
// and invitees, PATCH (reschedule), cancel, the invitees and «أعد الإرسال».

/** POST /meetings: instant (no startsAt) or scheduled; one result per invitee. */
export const createMeetingWith = (body: CreateMeeting) => apiSend<MeetingCreateResult>('POST', '/meetings', body);

/** PATCH /meetings/:id (creator or admin): a new time and/or duration. */
export const updateMeeting = ({ id, body }: { id: string; body: UpdateMeeting }) => apiSend('PATCH', `/meetings/${id}`, body);

/** POST /meetings/:id/cancel (creator or admin): 204; the invitees' links stop working. */
export const cancelMeeting = (id: string) => apiSend('POST', `/meetings/${id}/cancel`);

/** GET /meetings/:id/invitees (creator or admin): never a phone. */
export const meetingInviteesQuery = (id: string) =>
  queryOptions({
    queryKey: [...MEETINGS_KEY, 'invitees', id],
    queryFn: () => apiFetch<MeetingInviteeView[]>(`/meetings/${id}/invitees`),
  });

/** POST /meetings/:id/invitees: more invitees on an existing meeting. */
export const addMeetingInvitees = ({ id, invitees }: { id: string; invitees: MeetingInviteeInput[] }) =>
  apiSend<MeetingInviteResult[]>('POST', `/meetings/${id}/invitees`, { invitees });

/**
 * POST /meetings/:id/invitees/:inviteeId/resend: a new personal link and invitation text. The caller
 * keeps one clientRequestId per click (a retry reuses it, rule 8): a retried id whose text was
 * already queued sends nothing again; one that queued nothing returns a fresh link.
 */
export const resendInvite = (v: { meetingId: string; inviteeId: string; clientRequestId: string }) =>
  apiSend<MeetingInviteResult>('POST', `/meetings/${v.meetingId}/invitees/${v.inviteeId}/resend`, { clientRequestId: v.clientRequestId });

/** GET /meetings/invitee-options?q=: staff by name and role, students by name and code. */
export const inviteeOptionsQuery = (q: string) =>
  queryOptions({
    queryKey: [...MEETINGS_KEY, 'invitee-options', q],
    queryFn: () => apiFetch<MeetingInviteeOption[]>(`/meetings/invitee-options${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    staleTime: 30_000,
  });

const ERRORS: Record<string, string | undefined> = t.meetingInvites.errors;
const EXTRA: Record<string, string> = { meeting_ended: t.classroom.error.meeting_ended };

/** The line for a failed meeting command: its own wording when the code has one, else `fallback`. */
export function meetingErrorText(error: unknown, fallback: string = t.meetingInvites.error): string {
  const code = errorCode(error) ?? '';
  return ERRORS[code] ?? EXTRA[code] ?? fallback;
}
