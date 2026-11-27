import { defineRoute, phoneE164 } from '@ab/core';
import { z } from 'zod';
import { threadRatingSchema } from '../../schemas';
import { messageViewSchema } from '../message-view';

/** The rating request a guardian answers about the latest lesson that took place. */
export const lessonRatingRoutes = {
  /** 201 the queued row; 404 not_a_guardian or no_completed_lesson; 409 template_not_approved. */
  send: defineRoute({
    method: 'POST',
    path: '/threads/:phone/rating',
    params: z.object({ phone: phoneE164 }),
    body: threadRatingSchema,
    response: messageViewSchema,
    permissions: ['feedback.write'],
    tags: ['inbox'],
  }),
};
