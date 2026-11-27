import { messageStatusSchema } from '@ab/catalog';
import { z } from 'zod';

/** POST /lessons/:id/join-link (admin): the family's one-lesson link, sent by WhatsApp. */
export const joinLinkRequestSchema = z.object({ studentId: z.uuid() });
export type JoinLinkRequest = z.output<typeof joinLinkRequestSchema>;

/** `replayed`: the same link was already sent, so this send was not repeated. */
export const joinLinkResultSchema = z.object({
  expires_at: z.string(),
  replayed: z.boolean(),
  message_status: messageStatusSchema,
});
export type JoinLinkResult = z.infer<typeof joinLinkResultSchema>;

/** POST /lessons/:id/join-link/url: the guest link itself, to copy. */
export const joinLinkUrlSchema = z.object({ url: z.string(), expires_at: z.string() });
export type JoinLinkUrl = z.infer<typeof joinLinkUrlSchema>;

/** GET /join-links/:token/lesson: the lesson a family link opens, for its own staff. */
export const joinLinkLessonSchema = z.object({ lessonId: z.uuid() });
export type JoinLinkLesson = z.infer<typeof joinLinkLessonSchema>;
