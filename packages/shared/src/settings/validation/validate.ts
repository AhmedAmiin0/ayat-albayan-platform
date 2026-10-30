import { E164_RE } from '../../core/format/phone.js';
import { isTimeZone } from '../../core/schemas/common.js';
import { SETTING_DEFAULTS, SETTING_KEYS, SETTINGS_REGISTRY, type AcademySettings, type SettingKey } from '../registry.js';
import { shapeValid } from './shape.js';
import type { SettingDef } from '../defs.js';

const CURRENCY_RE = /^[A-Z]{3}$/;

const intIn = (v: unknown, def: { min: number; max: number }): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= def.min && v <= def.max;

/** Non-empty, strictly ascending, each in range. */
const ascending = (v: unknown, def: { min: number; max: number; maxItems: number }): boolean =>
  Array.isArray(v) &&
  v.length > 0 &&
  v.length <= def.maxItems &&
  v.every((x, i) => intIn(x, def) && (i === 0 || x > Number(v[i - 1])));

type Checks = { [T in SettingDef['type']]: (def: Extract<SettingDef, { type: T }>, v: unknown) => boolean };
const isString = (v: unknown): v is string => typeof v === 'string';

const CHECKS: Checks = {
  int: (def, v) => (def.nullable === true && v === null) || intIn(v, def),
  bool: (_def, v) => typeof v === 'boolean',
  string: (def, v) => isString(v) && v.trim() === v && v.length >= def.minLength && v.length <= def.maxLength,
  e164: (_def, v) => isString(v) && E164_RE.test(v),
  tz: (_def, v) => isString(v) && v !== '' && isTimeZone(v),
  currency: (_def, v) => isString(v) && CURRENCY_RE.test(v),
  int_list: (def, v) => ascending(v, def),
  enum: (def, v) => isString(v) && def.options.includes(v),
  json: (def, v) => (def.nullable === true && v === null) || shapeValid(def.shape, v),
};

/** Is the stored JSON a valid value for this entry? Same rules as the PATCH schema. */
export function isValidSetting(def: SettingDef, v: unknown): boolean {
  return (CHECKS[def.type] as (d: SettingDef, value: unknown) => boolean)(def, v);
}

/** Stored rows → typed settings, defaults filled in key by key (a malformed row reads as its default). */
export function readSettings(rows: readonly { key: string; value: unknown }[]): AcademySettings {
  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const out: Partial<Record<SettingKey, unknown>> = {};
  for (const key of SETTING_KEYS) {
    const v = stored.get(key);
    out[key] = stored.has(key) && isValidSetting(SETTINGS_REGISTRY[key], v) ? v : SETTING_DEFAULTS[key];
  }
  return out as AcademySettings;
}

