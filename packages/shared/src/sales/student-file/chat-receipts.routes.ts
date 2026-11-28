import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { threadFileSchema, threadMediaItemSchema } from '../../messaging';
import { salesChatReceiptsQuerySchema } from '../money';

const ACCESS = { permissions: ['self.sales_money'], tags: ['sales'] } as const;

/**
 * The images and PDFs a student's family sent in its chat, as receipt candidates (docs/16 row
 * 18): her student's chat, or with sales.renew_any the chat `phone` names; never a sticker or a
 * voice note. 403 not_your_student.
 */
export const salesChatReceiptRoutes = {
  /** The last 30 days, newest first, metadata only. */
  list: defineRoute({
    ...ACCESS,
    method: 'GET',
    path: '/sales/money/chat-receipts',
    query: salesChatReceiptsQuerySchema,
    response: z.array(threadMediaItemSchema),
  }),
  /** One listed file as a short-lived signed URL; 404 message_not_found outside that chat. */
  file: defineRoute({
    ...ACCESS,
    method: 'GET',
    path: '/sales/money/chat-receipts/:messageId',
    params: z.object({ messageId: id() }),
    query: salesChatReceiptsQuerySchema,
    response: threadFileSchema,
  }),
};
