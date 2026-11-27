import { z } from 'zod';
import { evolutionModeSchema, NUMBER_PURPOSES, waProviderSchema } from '@ab/catalog';
import { EVOLUTION_STATES } from '../evolution';
import { evolutionConfigSchema } from '../evolution-config';
import { evolutionSyncSchema } from '../evolution-sync';
import { NUMBER_SECRET_NAMES } from '../secret-names';

// docs/23 §3: no view ever carries a token or secret value, only set or not with a date.

/** The last line check of the number's phone_number_id (never a token). */
export const numberHealthSchema = z.object({
  /** The phone call answered (display number known). */
  ok: z.boolean(),
  status: z.string().nullable(),
  quality_rating: z.string().nullable(),
  verified_name: z.string().nullable(),
  /** Key NAMES the line still lacked when checked. */
  gaps: z.array(z.string()),
  errors: z.number(),
});
export type NumberHealth = z.infer<typeof numberHealthSchema>;

export const numberSecretStateSchema = z.object({
  set: z.boolean(),
  updated_at: z.string().nullable(),
});
export type NumberSecretState = z.infer<typeof numberSecretStateSchema>;

/** NumberView.evolution: null on any other provider. */
export const numberEvolutionViewSchema = z.object({
  mode: evolutionModeSchema,
  auto_sends: z.boolean(),
  /** Last state Evolution reported by webhook, and when (null = never). */
  state: z.enum(EVOLUTION_STATES).nullable(),
  state_at: z.string().nullable(),
  /** Every option of the number (no secret), and the last push read back (null = never). */
  config: evolutionConfigSchema,
  sync: evolutionSyncSchema.nullable(),
  /** The webhook URL the server pushes (read-only; null = its origin is not configured). */
  hook_url: z.string().nullable(),
});
export type NumberEvolutionView = z.infer<typeof numberEvolutionViewSchema>;

export const numberViewSchema = z.object({
  id: z.string(),
  label: z.string(),
  /** The preset role this number serves; `calls` = WhatsApp calls only, never a message. */
  purpose: z.enum(NUMBER_PURPOSES),
  provider: waProviderSchema,
  phone_number_id: z.string(),
  waba_id: z.string().nullable(),
  app_id: z.string().nullable(),
  display_phone_e164: z.string().nullable(),
  enabled: z.boolean(),
  is_default: z.boolean(),
  /** Fallback order inside its role when the chosen number is off (lower first). */
  fallback_rank: z.number().int(),
  health: numberHealthSchema.nullable(),
  checked_at: z.string().nullable(),
  updated_at: z.string(),
  secrets: z.record(z.enum(NUMBER_SECRET_NAMES), numberSecretStateSchema),
  /** An Evolution number's engine, switch and last state; null on any other provider. */
  evolution: numberEvolutionViewSchema.nullable(),
});
export type NumberView = z.infer<typeof numberViewSchema>;

/**
 * Inbound rows FROM one of the academy's own numbers in the last 7 days (an old system still
 * sending to us). Kept for audit, hidden from every list.
 */
export const ownTrafficViewSchema = z.object({ inbound_7d: z.number().int().min(0) });
export type OwnTrafficView = z.infer<typeof ownTrafficViewSchema>;
