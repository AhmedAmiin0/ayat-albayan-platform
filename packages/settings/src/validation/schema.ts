import { z } from 'zod';
import { E164_RE, timeZone } from '@ab/core';
import {
  SETTING_FIELD_OF,
  SETTING_KEY_OF,
  SETTING_KEYS,
  SETTINGS_REGISTRY,
  type AcademySettings,
  type SettingField,
  type SettingsUpdate,
} from '../registry.js';
import { shapeZod } from './shape.js';
import { byType, type SettingDef, type SettingTypeTable } from '../defs.js';

const orNull = (nullable: boolean | undefined, schema: z.ZodType): z.ZodType =>
  nullable ? schema.nullable() : schema;
const ascending = (h: readonly number[]): boolean =>
  h.every((v, i) => i === 0 || v > (h[i - 1] ?? 0));

/** One PATCH field per setting type (docs/36 F-4: exhaustive, each builder gets its own def). */
const SETTING_ZOD: SettingTypeTable<z.ZodType> = {
  int: (def) => orNull(def.nullable, z.int().min(def.min).max(def.max)),
  bool: () => z.boolean(),
  string: (def) => z.string().trim().min(def.minLength).max(def.maxLength),
  e164: () => z.string().regex(E164_RE, 'invalid_phone'),
  tz: () => timeZone,
  currency: () => z.string().regex(/^[A-Z]{3}$/),
  int_list: (def) =>
    z
      .array(z.int().min(def.min).max(def.max))
      .min(1)
      .max(def.maxItems)
      .refine(ascending, 'not_ascending'),
  enum: (def) => z.enum(def.options as [string, ...string[]]),
  json: (def) => orNull(def.nullable, shapeZod(def.shape)),
};

/** One entry's PATCH field. The follow-up list keeps its 'not_ascending' message (the web names it). */
export function settingZod(def: SettingDef): z.ZodType {
  return byType(SETTING_ZOD, def);
}

const shape = Object.fromEntries(
  SETTING_KEYS.filter((k) => (SETTINGS_REGISTRY[k] as SettingDef).patch !== false).map((k) => [
    SETTING_FIELD_OF[k],
    settingZod(SETTINGS_REGISTRY[k]).optional(),
  ]),
);

/** PATCH /settings (admin), generated from the registry: camelCase fields, each optional. */
export const settingsUpdateSchema = z.object(shape) as unknown as z.ZodType<SettingsUpdate>;

/** PATCH body (camelCase, only sent keys) → settings rows to write (snake_case). */
export function settingsChanges(update: SettingsUpdate): Partial<AcademySettings> {
  const out: Partial<Record<string, unknown>> = {};
  for (const [field, value] of Object.entries(update) as [SettingField, unknown][]) {
    const key = SETTING_KEY_OF[field];
    if (key && value !== undefined) out[key] = value;
  }
  return out as Partial<AcademySettings>;
}
