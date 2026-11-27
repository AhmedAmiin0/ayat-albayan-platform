import { defineRoute } from '@ab/core';
import { z } from 'zod';
import {
  roomOpenResultSchema,
  studentJoinLinkUrlSchema,
  studentLinkViewSchema,
} from './lesson-room.schemas';

const byId = z.object({ id: z.uuid() });
/** Any text: a token that is not ours is answered 404 link_invalid after the rate limit. */
const byToken = z.object({ token: z.string() });
const tags = ['classroom'] as const;

/** A lesson's room and the student's long-lived link (R-LES-01). */
export const lessonRoomRoutes = {
  /** Admin or the lesson's teacher, before the usual window; 409 lesson_not_open, 410. */
  open: defineRoute({
    method: 'POST',
    path: '/lessons/:id/room/open',
    params: byId,
    response: roomOpenResultSchema,
    permissions: ['classroom.host'],
    tags,
  }),
  /** No login: the token is the whole credential; 404 link_invalid, 429. */
  studentLink: defineRoute({
    method: 'GET',
    path: '/public/student/:token',
    params: byToken,
    response: studentLinkViewSchema,
    tags,
  }),
  /** Creates or rotates the student's link; the old one stops working. */
  issueStudentLink: defineRoute({
    method: 'POST',
    path: '/students/:id/join-link',
    params: byId,
    response: studentJoinLinkUrlSchema,
    permissions: ['classroom.links'],
    tags,
  }),
};
