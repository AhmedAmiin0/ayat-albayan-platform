import { z } from 'zod';
import { WA_LINES } from '../enums/messaging.js';
import { leadQualificationSchema } from '../schemas/leads.js';
import { BODY_SLOTS, type BodySlot } from './templates.js';

// Phase 4 request bodies (docs/12 §4). Commands are camelCase, like every other request.

/** WhatsApp's text-message limit. */
export const WA_TEXT_MAX = 4096;

/** POST /threads/:phone/text: a session message (24 h window only, else 409 session_closed). */
export const threadTextSchema = z.object({
  text: z.string().trim().min(1).max(WA_TEXT_MAX),
  /** Idempotency (rule 8): a retried send returns the first row. */
  clientRequestId: z.uuid().optional(),
});

const paramText = z.string().trim().min(1).max(1024).optional();
const slotsShape = Object.fromEntries(BODY_SLOTS.map((s) => [s, paramText])) as Record<BodySlot, typeof paramText>;

/** messages.template_params an admin can fill ({{1}}…{{9}}); documents and payloads are set by the API. */
export const templateParamsInputSchema = z.object({
  ...slotsShape,
  button: z.string().trim().min(1).max(200).optional(),
});

/** A registry key: a producer's (TEMPLATE_KEYS) or a template imported from Meta (key = its Meta name). */
export const TEMPLATE_KEY_PATTERN = /^[a-z0-9_]{1,512}$/;

/** POST /threads/:phone/template: any approved template, from the inbox (the API's registry validates the key). */
export const threadTemplateSchema = z.object({
  key: z.string().trim().regex(TEMPLATE_KEY_PATTERN),
  params: templateParamsInputSchema,
  lessonId: z.uuid().optional(),
  clientRequestId: z.uuid().optional(),
});

/** POST /threads/:phone/rating «إرسال تقييم الحلقة»: the API picks the lesson; the id makes a retry safe. */
export const threadRatingSchema = z.object({ clientRequestId: z.uuid() });

/**
 * PATCH /messaging/templates/:key/starter: the admin offers a template to sales to start a chat, or
 * stops. Named like the TemplateView field it sets (decision 2026-10-12), not camelCase.
 */
export const templateStarterSchema = z.object({ sales_starter: z.boolean() });

/** POST /messaging/templates/health: one line (WABA) only; none = every configured line (owner 2026-10-18). */
export const templateHealthSchema = z.object({ line: z.enum(WA_LINES).optional() });

/** PATCH /messaging/templates/:key/line: the number this template goes from (audited). */
export const templateLineSchema = z.object({ line: z.enum(WA_LINES) });

/** PATCH /leads/:id/qualification: merged into leads.qualification; null clears a field. */
export const leadQualificationPatchSchema = leadQualificationSchema.partial();

/** PATCH /leads/:id/follow-up: the admin's per-lead pause (R-LEAD-05). */
export const leadFollowUpSchema = z.object({ paused: z.boolean() });

export type ThreadText = z.infer<typeof threadTextSchema>;
export type TemplateParamsInput = z.infer<typeof templateParamsInputSchema>;
export type ThreadTemplate = z.infer<typeof threadTemplateSchema>;
export type ThreadRating = z.infer<typeof threadRatingSchema>;
export type TemplateStarter = z.infer<typeof templateStarterSchema>;
export type TemplateHealthInput = z.infer<typeof templateHealthSchema>;
export type TemplateLineInput = z.infer<typeof templateLineSchema>;
export type LeadQualificationPatch = z.infer<typeof leadQualificationPatchSchema>;
export type LeadFollowUp = z.infer<typeof leadFollowUpSchema>;
