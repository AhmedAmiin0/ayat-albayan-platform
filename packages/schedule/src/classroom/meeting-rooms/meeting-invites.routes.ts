import { defineRoute } from '@ab/core';
import { z } from 'zod';
import {
  addMeetingInviteesSchema,
  meetingInviteeOptionSchema,
  meetingInviteeOptionsQuerySchema,
  resendMeetingInviteSchema,
  updateMeetingSchema,
} from '../meeting-invites';
import { meetingInviteeViewSchema, meetingInviteResultSchema } from './meeting-views.schemas';

const byMeeting = z.object({ id: z.uuid() });
const access = { permissions: ['meetings.write'], tags: ['classroom'] } as const;

/**
 * Scheduled meetings and their invitees (R-MEET-01/02): the creator or an admin reschedules,
 * cancels, adds and resends (403 otherwise, 404 meeting_not_found, 410 meeting_ended).
 */
export const meetingInviteRoutes = {
  /** The caller's own profile is left out; students only within the caller's scope. */
  inviteeOptions: defineRoute({
    method: 'GET',
    path: '/meetings/invitee-options',
    query: meetingInviteeOptionsQuerySchema,
    response: z.array(meetingInviteeOptionSchema),
    ...access,
  }),
  /** 400 starts_in_past | too_far_ahead | not_scheduled; staff are told again. */
  update: defineRoute({
    method: 'PATCH',
    path: '/meetings/:id',
    params: byMeeting,
    body: updateMeetingSchema,
    response: 'empty',
    ...access,
  }),
  /** Personal links stop working; a second cancel is a no-op. */
  cancel: defineRoute({
    method: 'POST',
    path: '/meetings/:id/cancel',
    params: byMeeting,
    response: 'empty',
    ...access,
  }),
  invitees: defineRoute({
    method: 'GET',
    path: '/meetings/:id/invitees',
    params: byMeeting,
    response: z.array(meetingInviteeViewSchema),
    ...access,
  }),
  /** One result per new invitee; 400 too_many_invitees, 409 invite_limit. */
  add: defineRoute({
    method: 'POST',
    path: '/meetings/:id/invitees',
    params: byMeeting,
    body: addMeetingInviteesSchema,
    response: z.array(meetingInviteResultSchema),
    ...access,
  }),
  /** A new personal link for that invitee only; a retried request id sends once. */
  resend: defineRoute({
    method: 'POST',
    path: '/meetings/:id/invitees/:inviteeId/resend',
    params: byMeeting.extend({ inviteeId: z.uuid() }),
    body: resendMeetingInviteSchema,
    response: meetingInviteResultSchema,
    ...access,
  }),
};
