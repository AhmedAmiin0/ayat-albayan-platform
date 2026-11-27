import { waLineSchema, waProviderSchema } from '@ab/catalog';
import { instant } from '@ab/core';
import { z } from 'zod';
import { templateViewSchema } from './template-view.schemas';

// The template registry per number: which number each template goes from and its Meta sync per
// number. Ids only, never a token.

/** One WhatsApp line as the registry knows it from env: no Graph call. */
export const templateLineFactsSchema = z.object({
  line: waLineSchema,
  configured: z.boolean(),
  /** The line's driver (WA_PROVIDER / WA_CHAT_PROVIDER). */
  provider: waProviderSchema,
  waba_id: z.string().nullable(),
  phone_number_id: z.string().nullable(),
});
export type TemplateLineFacts = z.infer<typeof templateLineFactsSchema>;

export const templateSkipCodeSchema = z.enum([
  'bad_key', 'media_header', 'no_body', 'named_vars', 'button_value', 'key_taken',
]);

/** Why a sync did not import a template: a code (templates.perNumber.skipReasons.<code>). */
export const templateSkipReasonSchema = z.union([
  z.object({ code: z.literal('category'), category: z.string() }),
  z.object({ code: z.literal('too_many_vars'), max: z.number().int() }),
  z.object({ code: templateSkipCodeSchema }),
]);
export type TemplateSkipReason = z.infer<typeof templateSkipReasonSchema>;

/** A Meta template one sync did not import (its name + language), and why. */
export const templateSkipSchema = z.object({ name: z.string(), reason: templateSkipReasonSchema });
export type TemplateSkip = z.infer<typeof templateSkipSchema>;

/** One line's sync with Meta: only its own rows against its own WABA's list. */
export const templateLineSyncSchema = templateLineFactsSchema.extend({
  ok: z.boolean(),
  /**
   * The line's failure code when ok is false: not_configured, meta_error, kapso_auth, crm_auth;
   * crm_scope_missing = the CRM key lacks templates:read (docs/39); crm_managed = a CRM without
   * /templates (no row touched).
   */
  error: z.string().optional(),
  /** Meta's own message for meta_error; the missing scope for crm_scope_missing. */
  message: z.string().optional(),
  checked_at: instant,
  /** Templates on this WABA (as listed); 0 when the read failed. */
  meta_count: z.number().int(),
  /** Registry rows of this line updated from the list. */
  synced: z.number().int(),
  /** Keys of the rows this sync imported from the WABA. */
  imported: z.array(z.string()),
  skipped: z.array(templateSkipSchema),
});
export type TemplateLineSync = z.infer<typeof templateLineSyncSchema>;

/** POST /messaging/templates/health: each synced line's result, then the whole registry. */
export const templateHealthViewSchema = z.object({
  lines: z.array(templateLineSyncSchema),
  templates: z.array(templateViewSchema),
});
export type TemplateHealthView = z.infer<typeof templateHealthViewSchema>;

/** GET /messaging/templates/lines item: the line's facts, its rows' newest check, its last sync. */
export const templateLineViewSchema = templateLineFactsSchema.extend({
  last_checked_at: instant.nullable(),
  last_sync: templateLineSyncSchema.nullable(),
});
export type TemplateLineView = z.infer<typeof templateLineViewSchema>;

/** PATCH /messaging/templates/:key/line: the moved row after its new line's sync (null = unset). */
export const templateMoveViewSchema = z.object({
  template: templateViewSchema,
  sync: templateLineSyncSchema.nullable(),
});
export type TemplateMoveView = z.infer<typeof templateMoveViewSchema>;
