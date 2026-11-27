import { z } from 'zod';
import { waLineSchema } from '@ab/catalog';
import { commsSourceSchema } from '../schemas';

export const PARITY_FIELDS = [
  'configured',
  'provider',
  'phone_number_id',
  'waba_id',
  'app_id',
  'api_base',
  'api_version',
  'access_token',
  'app_secret',
  'webhook_phone_number_id',
] as const;
export const parityFieldSchema = z.enum(PARITY_FIELDS);
export type ParityField = z.infer<typeof parityFieldSchema>;
export const SECRET_PARITY_FIELDS: readonly ParityField[] = ['access_token', 'app_secret'];

/** missing = only one side has a value. */
export const PARITY_STATES = ['same', 'different', 'missing'] as const;
export const parityStateSchema = z.enum(PARITY_STATES);
export type ParityState = z.infer<typeof parityStateSchema>;

export const parityCellSchema = z.object({
  field: parityFieldSchema,
  state: parityStateSchema,
  /** Plain fields: the value; secrets: 'set' or null, never the value. */
  legacy: z.string().nullable(),
  module: z.string().nullable(),
});
export type ParityCell = z.infer<typeof parityCellSchema>;

export const parityRoleViewSchema = z.object({
  role: waLineSchema,
  /** The role's default enabled number in module mode, if any. */
  number_id: z.string().nullable(),
  number_label: z.string().nullable(),
  fields: z.array(parityCellSchema),
});
export type ParityRoleView = z.infer<typeof parityRoleViewSchema>;

/** A rule part where the module path and the legacy keys disagree; values JSON-encoded. */
export const ruleParityDiffSchema = z.object({
  key: z.string(),
  field: z.enum(['enabled', 'timing']),
  legacy: z.string(),
  module: z.string(),
});
export type RuleParityDiff = z.infer<typeof ruleParityDiffSchema>;

/**
 * The switch to module is refused while `differences` or `rules` is non-empty (docs/23b
 * decision 5); `rules` is optional only for older API builds.
 */
export const parityViewSchema = commsSourceSchema.extend({
  roles: z.array(parityRoleViewSchema),
  differences: z.array(
    parityCellSchema.pick({ field: true }).extend({
      role: waLineSchema,
      state: parityStateSchema.exclude(['same']),
    }),
  ),
  rules: z.array(ruleParityDiffSchema).optional(),
});
export type ParityView = z.infer<typeof parityViewSchema>;

export const commsSourceViewSchema = commsSourceSchema;
export type CommsSourceView = z.infer<typeof commsSourceViewSchema>;
