import { z } from 'zod';
import { integrationSourceSchema, waLineSchema } from '@ab/catalog';
import { NUMBER_SECRET_NAMES } from '../secret-names';

/** The import's fields: plain ids show their value, secrets never do. */
export const IMPORT_FIELDS = [
  'provider', 'phone_number_id', 'waba_id', 'app_id', 'access_token', 'app_secret',
] as const;
export const importFieldSchema = z.enum(IMPORT_FIELDS);
export type ImportField = z.infer<typeof importFieldSchema>;

export const importFieldViewSchema = z.object({
  field: importFieldSchema,
  secret: z.boolean(),
  source: integrationSourceSchema,
  /** Plain fields only; always null for a secret. */
  value: z.string().nullable(),
});
export type ImportFieldView = z.infer<typeof importFieldViewSchema>;

/** create = a row will be (was) added; exists = a row has this phone id; unconfigured = none. */
export const IMPORT_ACTIONS = ['create', 'exists', 'unconfigured'] as const;
export const importActionSchema = z.enum(IMPORT_ACTIONS);
export type ImportAction = z.infer<typeof importActionSchema>;

/** Why a role's row cannot be created: an id fails the wa_numbers checks; field names only. */
export const importBlockSchema = z.object({
  reason: z.literal('invalid_id'),
  fields: z.array(importFieldSchema),
});
export type ImportBlock = z.infer<typeof importBlockSchema>;

export const importRoleViewSchema = z.object({
  role: waLineSchema,
  action: importActionSchema,
  number_id: z.string().nullable(),
  fields: z.array(importFieldViewSchema),
  /** The number's secrets the apply copies (empty = nothing left to copy). */
  secrets_to_copy: z.array(z.enum(NUMBER_SECRET_NAMES)),
  /** Set = the apply skips this role (the other role still imports). Absent = importable. */
  not_importable: importBlockSchema.optional(),
});
export type ImportRoleView = z.infer<typeof importRoleViewSchema>;

/** changed = false on a second apply (a no-op diff). */
export const importResultSchema = z.object({
  dry_run: z.boolean(),
  changed: z.boolean(),
  roles: z.array(importRoleViewSchema),
});
export type ImportResult = z.infer<typeof importResultSchema>;
