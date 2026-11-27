import { z } from 'zod';
import { joinWindowViewSchema } from '../join-window/join-window.schemas';
import {
  meetingInviteChannelSchema,
  meetingInviteeKindSchema,
  meetingInviteStatusSchema,
} from '../meeting-invites';

/** GET /meetings/:id/invitees (creator or admin): never a phone. */
export const meetingInviteeViewSchema = z.object({
  id: z.string(),
  kind: meetingInviteeKindSchema,
  display_name: z.string(),
  channel: meetingInviteChannelSchema,
  status: meetingInviteStatusSchema,
  error_code: z.string().nullable(),
  sent_at: z.string().nullable(),
});
export type MeetingInviteeView = z.infer<typeof meetingInviteeViewSchema>;

/** One recipient's outcome: `link` and `invitation_text` once, to the creator, for non-staff. */
export const meetingInviteResultSchema = meetingInviteeViewSchema.extend({
  link: z.string().nullable(),
  invitation_text: z.string().nullable(),
});
export type MeetingInviteResult = z.infer<typeof meetingInviteResultSchema>;

/** The caller's own invitation on a meeting someone else created. */
export const myMeetingInviteSchema = meetingInviteeViewSchema.pick({ status: true, channel: true });
export type MyMeetingInvite = z.infer<typeof myMeetingInviteSchema>;

export const MEETING_STATES = ['open', 'ended'] as const;
export const meetingStateSchema = z.enum(MEETING_STATES);
export type MeetingState = z.infer<typeof meetingStateSchema>;

/** One row of GET /meetings: the caller's own and the ones they are invited to (admin: all). */
export const meetingViewSchema = z.object({
  id: z.string(),
  title: z.string(),
  created_by: z.string().nullable(),
  created_at: z.string(),
  ends_at: z.string().nullable(),
  /** null = an instant meeting. */
  starts_at: z.string().nullable(),
  planned_end_at: z.string().nullable(),
  cancelled_at: z.string().nullable(),
  state: meetingStateSchema,
  /** The join window of a scheduled meeting; null for an instant one, open until ended. */
  window: joinWindowViewSchema.nullable(),
  /** Join is shown when open, not cancelled and, if scheduled, inside its window. */
  can_join: z.boolean(),
  invitees_count: z.number().int(),
  my_invite: myMeetingInviteSchema.nullable(),
  /** The caller may end, cancel, reschedule and invite (its creator, or any admin). */
  can_manage: z.boolean(),
});
export type MeetingView = z.infer<typeof meetingViewSchema>;

/** GET /public/meetings/:token: what the guest page shows before joining. */
export const publicMeetingViewSchema = meetingViewSchema
  .pick({ title: true, state: true, starts_at: true })
  .extend({
    /** When a scheduled meeting's room opens (join_not_open_yet before it). */
    opens_at: z.string().nullable(),
  });
export type PublicMeetingView = z.infer<typeof publicMeetingViewSchema>;

/** POST /meetings/:id/link: the link is shown once (only its hash is stored). */
export const meetingCreatedSchema = z.object({ id: z.string(), url: z.string() });
export type MeetingCreated = z.infer<typeof meetingCreatedSchema>;

/** POST /meetings: the link, and one result per invitee. `replayed` = a retried clientRequestId. */
export const meetingCreateResultSchema = meetingCreatedSchema.extend({
  invitees: z.array(meetingInviteResultSchema),
  replayed: z.boolean(),
});
export type MeetingCreateResult = z.infer<typeof meetingCreateResultSchema>;

/** GET /meetings/by-link/:token: the meeting a signed-in staff member enters as staff. */
export const meetingIdSchema = meetingCreatedSchema.pick({ id: true });
export type MeetingId = z.infer<typeof meetingIdSchema>;
