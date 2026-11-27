import { id, instant, phoneE164 } from '@ab/core';
import { z } from 'zod';
import { signedDownloadSchema } from '../../../reports';
import { PDF_PREVIEW_PAGES } from './chat-files';

/** One chat and one of its messages: `:phone` any spelling of an E.164 number, the id a uuid. */
export const chatFileParamsSchema = z.object({ phone: phoneE164, messageId: id() });
export type ChatFileParams = z.infer<typeof chatFileParamsSchema>;

/** `?download=1` signs the URL to save under the file's name; any other value does not. */
export const chatFileQuerySchema = z.object({ download: z.string().optional() });
export type ChatFileQuery = z.infer<typeof chatFileQuerySchema>;

/** A page of the preview: 1 is the bubble's thumb, the last PDF_PREVIEW_PAGES. */
export const pdfPageParamsSchema = chatFileParamsSchema.extend({
  page: z.coerce.number().int().min(1).max(PDF_PREVIEW_PAGES),
});
export type PdfPageParams = z.infer<typeof pdfPageParamsSchema>;

/**
 * GET /threads/:phone/messages/:id/file and …/media/:id: the file signed (1 h), and the type it is
 * served as.
 */
export const threadFileSchema = signedDownloadSchema.extend({ mime: z.string().min(1) });
export type ThreadFile = z.infer<typeof threadFileSchema>;

/**
 * GET /threads/:phone/messages/:id/pdf/:page: that page as a signed JPEG, the PDF's page count and
 * size in bytes.
 */
export const threadPdfPageSchema = signedDownloadSchema.extend({
  page: z.number().int().min(1),
  pages: z.number().int().min(1),
  bytes: z.number().int().nonnegative(),
});
export type ThreadPdfPage = z.infer<typeof threadPdfPageSchema>;

/**
 * GET /threads/:phone/media: an inbound image or PDF of that chat (metadata only, nothing
 * downloaded). `expired`: older than WhatsApp keeps the file and never cached, so it cannot be had.
 */
export const threadMediaItemSchema = z.object({
  message_id: id(),
  created_at: instant,
  mime: z.string().min(1),
  caption: z.string().nullable(),
  expired: z.boolean(),
});
export type ThreadMediaItem = z.infer<typeof threadMediaItemSchema>;
