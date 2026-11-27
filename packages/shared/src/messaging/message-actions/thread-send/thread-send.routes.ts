import { defineRoute, phoneE164 } from '@ab/core';
import { z } from 'zod';
import { textSendAnswerSchema } from './thread-send.schemas';
import { messageViewSchema } from '../../chat/message-view';
import { threadTemplateSchema, threadTextSchema } from '../../schemas';

const sender = { permissions: ['inbox.send'], tags: ['inbox'] } as const;
const byPhone = z.object({ phone: phoneE164 });

/**
 * A session text or an approved template into a chat (docs/12 §4 H3, H4); a bad body is 400
 * first, then a bad phone is 400 invalid_phone. A repeated clientRequestId answers the first row.
 */
export const threadSendRoutes = {
  /** 201; 409 session_closed outside the 24 h window. */
  text: defineRoute({
    method: 'POST',
    path: '/threads/:phone/text',
    params: byPhone,
    body: threadTextSchema,
    response: textSendAnswerSchema,
    ...sender,
  }),
  /** 201; any approved template the sender may use. */
  template: defineRoute({
    method: 'POST',
    path: '/threads/:phone/template',
    params: byPhone,
    body: threadTemplateSchema,
    response: messageViewSchema,
    ...sender,
  }),
};
