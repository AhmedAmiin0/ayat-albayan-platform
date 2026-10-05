import { z } from 'zod';
import { leadQualificationSchema } from '../schemas/leads.js';
import { TEMPLATE_KEYS } from './templates.js';

// Phase 4 request bodies (docs/12 §4). Commands are camelCase, like every other request.

/** WhatsApp's text-message limit. */
export const WA_TEXT_MAX = 4096;

/** POST /threads/:phone/text: a session message (24 h window only, else 409 session_closed). */
export const threadTextSchema = z.object({
  text: z.string().trim().min(1).max(WA_TEXT_MAX),
  /** Idempotency (rule 8): a retried send returns the first row. */
  clientRequestId: z.uuid().optional(),
});

const paramText = z.string().trim().min(1).max(1024);

/** messages.template_params an admin can fill; documents and payloads are set by the API. */
export const templateParamsInputSchema = z.object({
  '1': paramText.optional(),
  '2': paramText.optional(),
  '3': paramText.optional(),
  button: z.string().trim().min(1).max(200).optional(),
});

/** POST /threads/:phone/template: any approved template, from the inbox. */
export const threadTemplateSchema = z.object({
  key: z.enum(TEMPLATE_KEYS),
  params: templateParamsInputSchema,
  lessonId: z.uuid().optional(),
  clientRequestId: z.uuid().optional(),
});

/** POST /threads/:phone/rating «إرسال تقييم الحلقة»: the API picks the lesson; the id makes a retry safe. */
export const threadRatingSchema = z.object({ clientRequestId: z.uuid() });

/** PATCH /leads/:id/qualification: merged into leads.qualification; null clears a field. */
export const leadQualificationPatchSchema = leadQualificationSchema.partial();

/** PATCH /leads/:id/follow-up: the admin's per-lead pause (R-LEAD-05). */
export const leadFollowUpSchema = z.object({ paused: z.boolean() });

export type ThreadText = z.infer<typeof threadTextSchema>;
export type TemplateParamsInput = z.infer<typeof templateParamsInputSchema>;
export type ThreadTemplate = z.infer<typeof threadTemplateSchema>;
export type ThreadRating = z.infer<typeof threadRatingSchema>;
export type LeadQualificationPatch = z.infer<typeof leadQualificationPatchSchema>;
export type LeadFollowUp = z.infer<typeof leadFollowUpSchema>;
