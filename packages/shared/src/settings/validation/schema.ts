import { z } from 'zod';
import { E164_RE } from '../../core/format/phone.js';
import { timeZone } from '../../core/schemas/common.js';
import { SETTING_FIELD_OF, SETTING_KEY_OF, SETTING_KEYS, SETTINGS_REGISTRY, type AcademySettings, type SettingField, type SettingsUpdate } from '../registry.js';
import { shapeZod } from './shape.js';
import type { SettingDef } from '../defs.js';

/** One entry's PATCH field. The follow-up list keeps its 'not_ascending' message (the web names it). */
export function settingZod(def: SettingDef): z.ZodType {
  switch (def.type) {
    case 'int': {
      const n = z.int().min(def.min).max(def.max);
      return def.nullable ? n.nullable() : n;
    }
    case 'bool':
      return z.boolean();
    case 'string':
      return z.string().trim().min(def.minLength).max(def.maxLength);
    case 'e164':
      return z.string().regex(E164_RE, 'invalid_phone');
    case 'tz':
      return timeZone;
    case 'currency':
      return z.string().regex(/^[A-Z]{3}$/);
    case 'int_list':
      return z
        .array(z.int().min(def.min).max(def.max))
        .min(1)
        .max(def.maxItems)
        .refine((h) => h.every((v, i) => i === 0 || v > (h[i - 1] ?? 0)), 'not_ascending');
    case 'enum':
      return z.enum(def.options as [string, ...string[]]);
    case 'json':
      return def.nullable ? shapeZod(def.shape).nullable() : shapeZod(def.shape);
  }
}

const shape = Object.fromEntries(
  SETTING_KEYS.filter((k) => (SETTINGS_REGISTRY[k] as SettingDef).patch !== false).map((k) => [SETTING_FIELD_OF[k], settingZod(SETTINGS_REGISTRY[k]).optional()]),
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
