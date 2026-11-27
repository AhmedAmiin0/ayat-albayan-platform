import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { roomJoinResultSchema } from '../room-state';
import {
  joinLinkLessonSchema,
  joinLinkRequestSchema,
  joinLinkResultSchema,
  joinLinkUrlSchema,
} from './lesson-join.schemas';

const byId = z.object({ id: z.uuid() });
/** Any text: a token that is not ours is answered 404 link_invalid by the api. */
const byToken = z.object({ token: z.string() });
const tags = ['classroom'] as const;

/** A lesson's room for its staff and the family's one-lesson link (R-LES-01). */
export const lessonJoinRoutes = {
  /** Admin, the lesson's teacher or an assigned assistant; 403, 410 join_closed, 503. */
  join: defineRoute({
    method: 'POST',
    path: '/lessons/:id/room/join',
    params: byId,
    response: roomJoinResultSchema,
    permissions: ['classroom.join'],
    tags,
  }),
  /** 409 template_not_approved, 404 student_not_in_lesson. */
  sendLink: defineRoute({
    method: 'POST',
    path: '/lessons/:id/join-link',
    params: byId,
    body: joinLinkRequestSchema,
    response: joinLinkResultSchema,
    permissions: ['classroom.links'],
    tags,
  }),
  /** Admin or the lesson's own teacher; nothing is sent. */
  linkUrl: defineRoute({
    method: 'POST',
    path: '/lessons/:id/join-link/url',
    params: byId,
    response: joinLinkUrlSchema,
    permissions: ['classroom.host'],
    tags,
  }),
  /** A family link opened by signed-in staff: 404 link_invalid, 403 not their lesson. */
  staffLessonOf: defineRoute({
    method: 'GET',
    path: '/join-links/:token/lesson',
    params: byToken,
    response: joinLinkLessonSchema,
    permissions: ['classroom.join'],
    tags,
  }),
};
