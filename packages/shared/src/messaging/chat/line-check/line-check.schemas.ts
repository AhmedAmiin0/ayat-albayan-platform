import { waLineSchema, waProviderSchema } from '@ab/catalog';
import { instant } from '@ab/core';
import { z } from 'zod';

const text = z.string().nullable();
const scopes = z.array(z.string()).nullable();

export const lineCheckStepSchema = z.enum(['phone', 'subscribed_apps', 'crm_me']);
export type LineCheckStep = z.infer<typeof lineCheckStepSchema>;

/** Whose key was refused: Kapso's, the CRM's or the Evolution instance's. */
export const lineCredentialSchema = z.enum(['kapso', 'crm', 'evolution']);
export type LineCredential = z.infer<typeof lineCredentialSchema>;

/** One failed call, phone first, then subscribed_apps; a crm line's only call is crm_me. */
const lineCheckErrorSchema = z.object({
  step: lineCheckStepSchema,
  code: z.number().nullable(),
  message: z.string(),
  credential: lineCredentialSchema.optional(),
});

/** null = not asked or the call failed; [] = no app subscribed, so no webhook arrives. */
const subscribedAppsSchema = z
  .array(z.object({ id: text, name: text, override_callback_uri: text }))
  .nullable();

/**
 * One WhatsApp line as its provider reports it (docs/12 §13.8–13.9). Ids, URLs and whether each
 * secret is set, never a token or a secret's value. An unconfigured line has every fact null.
 */
export const lineCheckViewSchema = z.object({
  line: waLineSchema,
  configured: z.boolean(),
  provider: waProviderSchema,
  /** Names of the keys the line still lacks to send under its provider. */
  gaps: z.array(z.string()),
  /** The chat line uses the notifications phone id, so the chat line is off. */
  duplicate_chat_phone: z.boolean(),
  kapso_webhook_secret: z.boolean().optional(),
  crm_webhook_secret: z.boolean().optional(),
  /** null = not known: GET /me failed. */
  crm_send_scope: z.boolean().nullable().optional(),
  crm_template_scopes_missing: scopes.optional(),
  /** Read scopes the key lacks; a timed-out send is then not confirmed (docs/19). */
  crm_read_scopes_missing: scopes.optional(),
  /** Meta lines, and a crm line before its switch to Meta (docs/19). */
  meta_ready: z
    .object({
      app_secret: z.boolean(),
      verify_token: z.boolean(),
      app_subscribed: z.boolean().nullable(),
    })
    .optional(),
  phone_number_id: text,
  waba_id: text,
  app_id: text,
  display_phone_number: text,
  verified_name: text,
  quality_rating: text,
  status: text,
  name_status: text,
  code_verification_status: text,
  subscribed_apps: subscribedAppsSchema,
  errors: z.array(lineCheckErrorSchema),
  checked_at: instant,
});
export type LineCheckView = z.infer<typeof lineCheckViewSchema>;

/** Always [notifications, chat]. */
export const lineCheckResponseSchema = z.array(lineCheckViewSchema);
