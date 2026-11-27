import { defineRoute, phoneE164 } from '@ab/core';
import { z } from 'zod';
import {
  chatFileParamsSchema,
  chatFileQuerySchema,
  pdfPageParamsSchema,
  threadFileSchema,
  threadMediaItemSchema,
  threadPdfPageSchema,
} from './chat-files.schemas';

const bubble = { permissions: ['inbox.read'], tags: ['inbox'] } as const;
const picker = { permissions: ['inbox.media'], tags: ['inbox'] } as const;

/**
 * A chat bubble's file: admin and sales; a teacher, even of that family, is 403 media_forbidden.
 * 404 message_not_found outside the chat, 410 media_expired when WhatsApp no longer has it.
 */
export const chatFileRoutes = {
  /** 200; our own copy, downloaded from WhatsApp on first use. */
  file: defineRoute({
    method: 'GET',
    path: '/threads/:phone/messages/:messageId/file',
    params: chatFileParamsSchema,
    query: chatFileQuerySchema,
    response: threadFileSchema,
    ...bubble,
  }),
  /** 200; one page of a PDF as a signed JPEG; 503 while another page renders. */
  pdfPage: defineRoute({
    method: 'GET',
    path: '/threads/:phone/messages/:messageId/pdf/:page',
    params: pdfPageParamsSchema,
    response: threadPdfPageSchema,
    ...bubble,
  }),
};

/** The invoice picker's files of a chat (R-MSG-06); a payment proof never reaches a teacher. */
export const chatMediaRoutes = {
  /** 200; inbound images and PDFs of the last 30 days, newest first, at most 12. */
  list: defineRoute({
    method: 'GET',
    path: '/threads/:phone/media',
    params: z.object({ phone: phoneE164 }),
    response: z.array(threadMediaItemSchema),
    ...picker,
  }),
  /** 200; one listed file signed; 400 invoice_message for any other file of the chat. */
  file: defineRoute({
    method: 'GET',
    path: '/threads/:phone/media/:messageId',
    params: chatFileParamsSchema,
    response: threadFileSchema,
    ...picker,
  }),
};
