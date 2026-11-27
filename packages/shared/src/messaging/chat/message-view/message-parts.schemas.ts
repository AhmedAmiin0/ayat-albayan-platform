import { id, instant } from '@ab/core';
import { lessonStatusSchema, messageDirectionSchema } from '@ab/catalog';
import { z } from 'zod';
import { crmValuesSchema } from '../crm-names';
import {
  templateButtonKindSchema,
  templateHeaderKindSchema,
} from '../../templates/template-block/template-block';

/** Body variables {{1}}…{{9}} by position (BODY_SLOTS). */
const slot = z.string().optional();
const bodySlots = z.object({
  1: slot,
  2: slot,
  3: slot,
  4: slot,
  5: slot,
  6: slot,
  7: slot,
  8: slot,
  9: slot,
});

/** messages.template_params as a view carries it: body slots by position, buttons and header. */
export const templateParamsSchema = bodySlots.extend({
  button: z.string().optional(),
  buttons: z.array(z.string()).optional(),
  payloads: z.array(z.string()).optional(),
  document: z.object({ bucket: z.string(), path: z.string(), filename: z.string() }).optional(),
  crm: crmValuesSchema.optional(),
});

/** What WhatsApp draws around a template's body: header, footer and buttons. */
export const messageTemplateBlockSchema = z.object({
  header: z
    .object({ type: templateHeaderKindSchema, text: z.string().optional() })
    .nullable(),
  footer: z.string().nullable(),
  buttons: z.array(
    z.object({
      type: templateButtonKindSchema,
      text: z.string(),
      url: z.string().optional(),
      phone: z.string().optional(),
    }),
  ),
});

/** The message a bubble answers, or the marker that WhatsApp quoted one we never stored. */
export const replyQuoteSchema = z.union([
  z.object({ unavailable: z.literal(true) }),
  z.object({
    id: id(),
    direction: messageDirectionSchema,
    body: z.string().nullable(),
    media_mime: z.string().nullable(),
    template_key: z.string().nullable(),
    sender_name: z.string().nullable(),
  }),
]);

/** A bubble's reactions; `ours_by` = the staff member who reacted (profiles.full_name). */
export const messageReactionsSchema = z.object({
  theirs: z.string().nullable(),
  ours: z.string().nullable(),
  ours_by: z.string().nullable(),
});
export type MessageReactions = z.infer<typeof messageReactionsSchema>;

/** Hidden from the platform: who hid it (null once their login is gone) and when. */
export const messageHiddenSchema = z.object({ by_name: z.string().nullable(), at: instant });

/** The lesson of a message's lesson_id as it is now; ends_at is absent in an old cache. */
export const messageLessonSchema = z.object({
  starts_at: instant,
  ends_at: instant.optional(),
  status: lessonStatusSchema,
});
export type MessageLesson = z.infer<typeof messageLessonSchema>;
