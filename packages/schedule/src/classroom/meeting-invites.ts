import { clientRequestId } from '@ab/core';
import { z } from 'zod';

// Scheduled meetings and invitations (R-MEET-01..03, migrations 410–419). Staff are
// invited in the app (the bell, kind meeting_invite); a family (picked from the students: the guardian's
// phone is resolved by the API, never sent to a client) or any typed phone gets a WhatsApp CHAT message
// inside its 24 h window only (no template). A closed window is not an error: that recipient's result
// says so and the creator copies the personal link and the invitation text instead.

export const MEETING_INVITEE_KINDS = ['staff', 'student', 'phone'] as const;
export const meetingInviteeKindSchema = z.enum(MEETING_INVITEE_KINDS);
export type MeetingInviteeKind = z.infer<typeof meetingInviteeKindSchema>;

export const MEETING_INVITE_CHANNELS = ['in_app', 'whatsapp', 'link'] as const;
export const meetingInviteChannelSchema = z.enum(MEETING_INVITE_CHANNELS);
export type MeetingInviteChannel = z.infer<typeof meetingInviteChannelSchema>;

export const MEETING_INVITE_STATUSES = ['pending', 'sent', 'window_closed', 'failed', 'cancelled'] as const;
export const meetingInviteStatusSchema = z.enum(MEETING_INVITE_STATUSES);
export type MeetingInviteStatus = z.infer<typeof meetingInviteStatusSchema>;

/** At most 30 invitees per meeting (one request and in total). */
export const MAX_MEETING_INVITEES = 30;
/** At most 100 WhatsApp invitations per staff login per day (409 invite_limit). */
export const MAX_DAILY_WHATSAPP_INVITES = 100;
export const MEETING_DURATION_MIN = 15;
export const MEETING_DURATION_MAX = 240;
export const DEFAULT_MEETING_DURATION = 60;
/** A scheduled meeting starts at most 90 days ahead. */
export const MEETING_MAX_AHEAD_DAYS = 90;

/** Only admin and sales may invite any phone and see every student; others get 403. */
export const mayInvitePhones = (role: string | null | undefined): boolean => role === 'admin' || role === 'sales';

/** One invitee as the client picks it: a staff profile, a student (→ the guardian) or a typed phone. */
export const meetingInviteeInputSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('staff'), profileId: z.uuid() }),
  z.object({ kind: z.literal('student'), studentId: z.uuid() }),
  z.object({ kind: z.literal('phone'), phone: z.string().trim().min(6).max(32) }),
]);
export type MeetingInviteeInput = z.output<typeof meetingInviteeInputSchema>;

export const meetingDurationSchema = z
  .number()
  .int()
  .min(MEETING_DURATION_MIN)
  .max(MEETING_DURATION_MAX);

/** PATCH /meetings/:id (creator or admin): a new title and/or a new time. */
export const updateMeetingSchema = z
  .object({
    title: z.string().trim().min(1).max(60).optional(),
    startsAt: z.iso.datetime({ offset: true }).optional(),
    durationMin: meetingDurationSchema.optional(),
  })
  .refine((v) => v.title !== undefined || v.startsAt !== undefined || v.durationMin !== undefined, { message: 'empty' });
export type UpdateMeeting = z.output<typeof updateMeetingSchema>;

/** POST /meetings/:id/invitees: more invitees on an existing meeting. */
export const addMeetingInviteesSchema = z.object({
  invitees: z.array(meetingInviteeInputSchema).min(1).max(MAX_MEETING_INVITEES),
});

/** POST /meetings/:id/invitees/:inviteeId/resend: rule 8, a double tap sends once. */
export const resendMeetingInviteSchema = z.object({ clientRequestId });

/** GET /meetings/invitee-options?q= */
export const meetingInviteeOptionsQuerySchema = z.object({
  q: z.string().trim().max(60).optional(),
});

/** GET /meetings/invitee-options: staff by name and role, students by name and code. Never a phone. */
export type MeetingInviteeOption =
  | { kind: 'staff'; id: string; name: string; role: string }
  | { kind: 'student'; id: string; name: string; code: string };
