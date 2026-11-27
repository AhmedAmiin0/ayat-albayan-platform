import { id, instant } from '@ab/core';
import { TEMPLATE_CATEGORIES, TEMPLATE_STATUSES, WA_LINES } from '@ab/catalog';
import { z } from 'zod';
import { QUICK_REPLY_INTENTS } from '../../replies/quick-reply';
import {
  templateButtonKindSchema, templateHeaderKindSchema,
} from '../template-block/template-block';

/** message_templates.buttons: a link with its {{1}} suffix, or a quick reply and its tap. */
export const templateButtonSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('url'),
    url: z.string(),
    text: z.string().optional(),
    example: z.string().optional(),
  }),
  z.object({
    type: z.literal('quick_reply'),
    text: z.string(),
    intent: z.enum(QUICK_REPLY_INTENTS),
  }),
]);

/** message_templates.display: the header and every button as Meta's sync last reported them. */
export const templateDisplaySchema = z.object({
  header: z.object({ type: templateHeaderKindSchema, text: z.string().optional() }).nullable(),
  buttons: z.array(
    z.object({
      type: templateButtonKindSchema,
      text: z.string(),
      url: z.string().optional(),
      phone: z.string().optional(),
    }),
  ),
});

/** One (template, number) approval: message_template_numbers. */
export const templateNumberApprovalSchema = z.object({
  number_id: id(),
  status: z.enum(TEMPLATE_STATUSES),
  last_checked_at: instant.nullable(),
  last_error: z.string().nullable(),
});
export type TemplateNumberApproval = z.infer<typeof templateNumberApprovalSchema>;

/**
 * One message_templates row. The optional parts are absent from older APIs; `numbers` only where
 * the caller read the approvals per number (docs/23 phase 5).
 */
export const templateViewSchema = z.object({
  key: z.string(),
  meta_name: z.string(),
  language: z.string(),
  category: z.enum(TEMPLATE_CATEGORIES),
  header_format: z.literal('document').nullable(),
  body_ar: z.string(),
  footer_ar: z.string().nullable(),
  params: z.array(z.string()),
  buttons: z.array(templateButtonSchema),
  display: templateDisplaySchema.nullable().optional(),
  status: z.enum(TEMPLATE_STATUSES),
  quality: z.string().nullable(),
  meta_id: z.string().nullable(),
  last_checked_at: instant.nullable(),
  last_error: z.string().nullable(),
  submitted_at: instant.nullable(),
  line: z.enum(WA_LINES),
  sales_starter: z.boolean(),
  number_id: id().nullable().optional(),
  numbers: z.array(templateNumberApprovalSchema).optional(),
  crm_name: z.string().nullable().optional(),
  crm_language: z.string().nullable().optional(),
  created_by: id().nullable().optional(),
  approved_edits: z.array(instant).optional(),
});
export type TemplateView = z.infer<typeof templateViewSchema>;
