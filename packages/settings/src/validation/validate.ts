import {
  SETTING_DEFAULTS,
  SETTING_KEYS,
  SETTINGS_REGISTRY,
  type AcademySettings,
  type SettingKey,
} from '../registry.js';
import { storedSettingZod } from './schema.js';
import type { SettingDef } from '../defs.js';

/** Is the stored JSON valid for this entry? The PATCH schema minus its trim (docs/36 z3). */
export function isValidSetting(def: SettingDef, v: unknown): boolean {
  return storedSettingZod(def).safeParse(v).success;
}

/** Stored rows → typed settings, defaults filled key by key (a bad row reads as the default). */
export function readSettings(
  rows: readonly { key: string; value: unknown }[],
): AcademySettings {
  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const out: Partial<Record<SettingKey, unknown>> = {};
  for (const key of SETTING_KEYS) {
    const v = stored.get(key);
    const valid = stored.has(key) && isValidSetting(SETTINGS_REGISTRY[key], v);
    out[key] = valid ? v : SETTING_DEFAULTS[key];
  }
  return out as AcademySettings;
}
