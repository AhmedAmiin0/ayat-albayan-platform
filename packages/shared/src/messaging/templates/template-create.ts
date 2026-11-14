import { z } from 'zod';
import { WA_LINES } from '@ab/catalog';
import { TEMPLATE_KEY_PATTERN } from '../schemas.js';
import { BODY_SLOTS } from './templates.js';

// «قالب جديد» (owner 2026-10-31: «add ability to create and sync templates from the admin»): what
// an admin types for a brand-new registry row. The API checks Meta's body rules
// (template-review.ts) and that the name is free; sending it to Meta stays the separate, explicit
// «إرسال إلى ميتا».

/**
 * Meta's limits for a template's parts (characters), and the buttons WhatsApp shows under a bubble.
 */
export const TEMPLATE_LIMITS = {
  body: 1024,
  header: 60,
  footer: 60,
  buttonText: 25,
  sample: 200,
  buttons: 3,
  /** Meta takes at most two link buttons on one template. */
  urlButtons: 2,
} as const;

/**
 * What a new template's quick reply does when tapped (webhook.quick-reply.ts acts on confirm /
 * stop).
 */
export const CREATE_REPLY_INTENTS = ['confirm', 'reschedule', 'stop'] as const;

/** Fixed words: a header or footer takes no {{n}} here (nothing would fill it at send time). */
const fixedText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((v) => !v.includes('{{'), 'no_variables')
    .transform((v) => v || null)
    .nullable()
    .default(null);

export const templateButtonText = z.string().trim().min(1).max(TEMPLATE_LIMITS.buttonText);

/**
 * A URL button: https, its only variable a {{1}} suffix (params.buttons fills each by order);
 * `example` is that suffix's sample for Meta's reviewer.
 */
export const templateUrlButton = z.object({
  type: z.literal('url'),
  text: templateButtonText,
  url: z.string().trim().max(2000).regex(/^https:\/\/[^\s{}]+(\{\{1\}\})?$/),
  example: z.string().trim().min(1).max(TEMPLATE_LIMITS.sample).regex(/^\S+$/).optional(),
});

const replyButton = z.object({
  type: z.literal('quick_reply'),
  text: templateButtonText,
  intent: z.enum(CREATE_REPLY_INTENTS),
});

/**
 * {{n}}'s name (one the composers label and prefill, or var_n) and its sample for Meta's reviewer.
 */
export const templateParam = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
  sample: z.string().trim().min(1).max(TEMPLATE_LIMITS.sample),
});

export const fewUrls = (list: readonly { type: string }[]): boolean =>
  list.filter((b) => b.type === 'url').length <= TEMPLATE_LIMITS.urlButtons;

/** A footer: fixed words, no variable. */
export const templateFooter = fixedText(TEMPLATE_LIMITS.footer);

/** The body as typed: Meta's review rules are the API's (template-review.ts). */
export const templateBody = z.string().trim().min(1).max(TEMPLATE_LIMITS.body);

/** POST /messaging/templates: one new row, not submitted; params[i] is {{i+1}}. */
export const templateCreateSchema = z.object({
  key: z.string().trim().regex(TEMPLATE_KEY_PATTERN),
  line: z.enum(WA_LINES),
  category: z.enum(['utility', 'marketing']),
  language: z.string().trim().regex(/^[a-z]{2,3}(_[A-Z]{2})?$/).default('ar'),
  header: fixedText(TEMPLATE_LIMITS.header),
  body: templateBody,
  footer: templateFooter,
  params: z.array(templateParam).max(BODY_SLOTS.length).default([]),
  buttons: z
    .array(z.discriminatedUnion('type', [templateUrlButton, replyButton]))
    .max(TEMPLATE_LIMITS.buttons)
    .refine(fewUrls, 'url_buttons')
    .default([]),
});

export type TemplateCreateInput = z.output<typeof templateCreateSchema>;
