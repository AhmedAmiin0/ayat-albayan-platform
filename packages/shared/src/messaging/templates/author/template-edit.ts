import { z } from 'zod';
import { QUICK_REPLY_INTENTS } from '../../replies/quick-reply.js';
import { TEMPLATE_KEY_PATTERN } from '../../schemas.js';
import { BODY_SLOTS } from '../templates.js';
import {
  fewUrls, TEMPLATE_LIMITS, templateBody, templateButtonText, templateFooter, templateParam,
  templateUrlButton,
} from '../template-create.js';

// «تعديل» and «قالب جديد» for sales (owner 2026-11-14: «add the option to add or edit templates on
// the platform for sales and admin»). Meta keeps the name and the category of an edited template:
// neither is in the edit, and the header is never edited here.

/** :key of the edit routes (a registry key, as Meta names templates). */
export const templateKeyParam = z.string().regex(TEMPLATE_KEY_PATTERN);

/** A quick reply; `intent` is what the webhook does on a tap (absent = nothing, a plain answer). */
const editReply = z.object({
  type: z.literal('quick_reply'),
  text: templateButtonText,
  intent: z.enum(QUICK_REPLY_INTENTS).optional(),
});

const params = z.array(templateParam).max(BODY_SLOTS.length).default([]);

/** PATCH …/content (admin) and …/authored/:key (sales): the new words of one template. */
export const templateEditSchema = z.object({
  body: templateBody,
  footer: templateFooter,
  params,
  buttons: z
    .array(z.discriminatedUnion('type', [templateUrlButton, editReply]))
    .max(TEMPLATE_LIMITS.buttons)
    .refine(fewUrls, 'url_buttons')
    .default([]),
});
export type TemplateEditInput = z.output<typeof templateEditSchema>;
export type TemplateEditButton = TemplateEditInput['buttons'][number];

/** The two categories a sales user picks from (an authentication template is the platform's). */
export const AUTHOR_CATEGORIES = ['utility', 'marketing'] as const;
export type AuthorCategory = (typeof AUTHOR_CATEGORIES)[number];

/**
 * POST /messaging/templates/authored: a sales template, straight to Meta on the chat line. Text
 * only: no header, quick replies only. `key` blank = the API names it.
 */
export const templateAuthorSchema = z.object({
  key: z
    .string()
    .trim()
    .transform((v) => v || null)
    .pipe(z.string().regex(TEMPLATE_KEY_PATTERN).nullable())
    .nullable()
    .default(null),
  category: z.enum(AUTHOR_CATEGORIES),
  body: templateBody,
  footer: templateFooter,
  params,
  buttons: z
    .array(z.object({ type: z.literal('quick_reply'), text: templateButtonText }))
    .max(TEMPLATE_LIMITS.buttons)
    .default([]),
});
export type TemplateAuthorInput = z.output<typeof templateAuthorSchema>;
