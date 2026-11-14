import {
  QUICK_REPLY_INTENTS, TEMPLATE_BUTTON_KINDS, TEMPLATE_CATEGORIES, TEMPLATE_HEADER_KINDS,
  TEMPLATE_STATUSES, WA_LINES,
} from '@ab/shared';
import { z } from 'zod';

// A template as «القوالب» reads it (the API's TemplateView, the fields both apps draw), parsed at
// the boundary (rule 12).

const button = z.union([
  z.object({
    type: z.literal('url'),
    url: z.string(),
    text: z.string().optional(),
    example: z.string().optional(),
  }),
  z.object({ type: z.literal('quick_reply'), text: z.string(), intent: z.enum(QUICK_REPLY_INTENTS) }),
]);

const display = z.object({
  header: z.object({ type: z.enum(TEMPLATE_HEADER_KINDS), text: z.string().optional() }).nullable(),
  buttons: z.array(z.object({
    type: z.enum(TEMPLATE_BUTTON_KINDS),
    text: z.string(),
    url: z.string().optional(),
    phone: z.string().optional(),
  })),
});

export const templateViewSchema = z.object({
  key: z.string(),
  meta_name: z.string(),
  language: z.string(),
  category: z.enum(TEMPLATE_CATEGORIES),
  header_format: z.literal('document').nullable(),
  body_ar: z.string(),
  footer_ar: z.string().nullable(),
  params: z.array(z.string()),
  buttons: z.array(button),
  display: display.nullable().optional(),
  status: z.enum(TEMPLATE_STATUSES),
  last_error: z.string().nullable(),
  line: z.enum(WA_LINES),
  sales_starter: z.boolean(),
  created_by: z.string().nullable().optional(),
  approved_edits: z.array(z.string()).optional(),
});

export type AuthorTemplate = z.infer<typeof templateViewSchema>;

export const templateListSchema = z.array(templateViewSchema);
