import { instant } from '@ab/core';
import { z } from 'zod';
import { settingConfirmSchema, settingGroupSchema } from '../groups';
import { settingOwnerSchema } from '../ownership';
import type { SettingType } from '../defs';
import { DESCRIPTION_MAX } from '../seed/entries';

export const SETTING_TYPES = [
  'int', 'bool', 'string', 'e164', 'tz', 'currency', 'int_list', 'enum', 'json',
] as const satisfies readonly SettingType[];
export const settingTypeSchema = z.enum(SETTING_TYPES);

/**
 * One row of GET /config/entries (docs/26 §2f): the stored row merged with its code entry. `value`
 * is the effective value (JSON null and a missing row read as the default); `stored` says whether a
 * non-null value is stored. `version` is 0 for a missing row (config_set accepts 0 for it).
 * `description` null shows the seeded text; `ownedBy` set means a module page edits the value.
 */
export const configEntrySchema = z.object({
  key: z.string(),
  module: z.string(),
  group: settingGroupSchema.nullable(),
  type: settingTypeSchema,
  bounds: z.record(z.string(), z.unknown()),
  value: z.unknown(),
  defaultValue: z.unknown(),
  stored: z.boolean(),
  description: z.string().nullable(),
  descriptionSeed: z.string().nullable(),
  descriptionEdited: z.boolean(),
  hintKey: z.string().nullable(),
  labelKey: z.string(),
  public: z.boolean(),
  version: z.number().int().min(0),
  updatedAt: instant.nullable(),
  updatedByName: z.string().nullable(),
  ownedBy: settingOwnerSchema.nullable(),
  confirm: settingConfirmSchema.nullable(),
  retired: z.boolean(),
});
export type ConfigEntry = z.infer<typeof configEntrySchema>;

export const configEntriesResponseSchema = z.object({ entries: z.array(configEntrySchema) });
export type ConfigEntriesResponse = z.infer<typeof configEntriesResponseSchema>;

/** The answer of PATCH /config/entries/:key and PUT …/description: the row after the write. */
export const configEntryResultSchema = z.object({ entry: configEntrySchema });
export type ConfigEntryResult = z.infer<typeof configEntryResultSchema>;

/** `value: null` stores JSON null (= the default), never a delete. */
export const configEntryPatchSchema = z.object({
  value: z.unknown(),
  expectedVersion: z.number().int().min(0),
  confirmText: z.string().max(100).optional(),
});
export type ConfigEntryPatchInput = z.infer<typeof configEntryPatchSchema>;

/** null = restore the seeded text (clears the override too). */
export const configDescriptionSchema = z.object({
  text: z.string().trim().min(1).max(DESCRIPTION_MAX).nullable(),
});
export type ConfigDescriptionInput = z.infer<typeof configDescriptionSchema>;
