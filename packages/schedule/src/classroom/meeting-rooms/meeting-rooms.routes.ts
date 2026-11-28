import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { createMeetingSchema } from '../internal-meetings';
import { roomJoinResultSchema } from '../room-state';
import { guestJoinSchema } from '../schemas';
import {
  meetingCreatedSchema,
  meetingCreateResultSchema,
  meetingIdSchema,
  meetingViewSchema,
  publicMeetingViewSchema,
} from './meeting-views.schemas';

const byMeeting = z.object({ id: z.uuid() });
/** Any text: the api answers its own 404 for an identity it never minted. */
const byParticipant = byMeeting.extend({ identity: z.string() });
/** Any text: the api answers 404 link_invalid itself, after its rate limit. */
const byLink = z.object({ token: z.string() });
const tags = ['classroom'] as const;
const reads = { permissions: ['meetings.read'], tags } as const;
const writes = { permissions: ['meetings.write'], tags } as const;
const open = { isPublic: true, tags } as const;

/** Internal meetings (R-MEET-01/02): staff routes, then the link's door with no login. */
export const meetingRoomRoutes = {
  /** 201; the link and each personal link are shown once. No body = an instant meeting. */
  create: defineRoute({
    method: 'POST',
    path: '/meetings',
    body: createMeetingSchema.default({}),
    response: meetingCreateResultSchema,
    ...writes,
  }),
  /** Created or invited (an admin: all): the coming scheduled ones first, then the newest. */
  list: defineRoute({
    method: 'GET',
    path: '/meetings',
    response: z.array(meetingViewSchema),
    ...reads,
  }),
  byLink: defineRoute({
    method: 'GET',
    path: '/meetings/by-link/:token',
    params: byLink,
    response: meetingIdSchema,
    ...reads,
  }),
  end: defineRoute({
    method: 'POST',
    path: '/meetings/:id/end',
    params: byMeeting,
    response: 'empty',
    ...writes,
  }),
  /** A fresh link; the previous one stops working. */
  newLink: defineRoute({
    method: 'POST',
    path: '/meetings/:id/link',
    params: byMeeting,
    response: meetingCreatedSchema,
    ...writes,
  }),
  join: defineRoute({
    method: 'POST',
    path: '/meetings/:id/join',
    params: byMeeting,
    response: roomJoinResultSchema,
    ...writes,
  }),
  remove: defineRoute({
    method: 'POST',
    path: '/meetings/:id/participants/:identity/remove',
    params: byParticipant,
    response: 'empty',
    ...writes,
  }),
  publicView: defineRoute({
    method: 'GET',
    path: '/public/meetings/:token',
    params: byLink,
    response: publicMeetingViewSchema,
    ...open,
  }),
  guestJoin: defineRoute({
    method: 'POST',
    path: '/public/meetings/:token/join',
    params: byLink,
    body: guestJoinSchema,
    response: roomJoinResultSchema,
    ...open,
  }),
};
