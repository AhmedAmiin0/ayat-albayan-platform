import { ACADEMY_SETTINGS, ACCOUNTS_SETTINGS, REPORTS_SETTINGS, SALES_SETTINGS, UPLOADS_SETTINGS } from './registry.accounts.js';
import { CONFIG_SETTINGS } from './registry.config.js';
import { MESSAGING_SETTINGS } from './registry.messaging.js';
import { CLASSROOM_SETTINGS, SCHEDULE_SETTINGS } from './registry.schedule.js';
import { camelKey, type CamelKey, type SettingDef, type SettingValue } from './types.js';

/**
 * Every academy setting (public.settings rows), in page order. Add a key here (with its i18n label
 * and a seeding migration) and the PATCH schema, the read validators, the defaults, the
 * AcademySettings type and the admin field all follow.
 */
export const SETTINGS_REGISTRY = {
  ...MESSAGING_SETTINGS,
  ...SCHEDULE_SETTINGS,
  ...CLASSROOM_SETTINGS,
  ...REPORTS_SETTINGS,
  ...ACCOUNTS_SETTINGS,
  ...UPLOADS_SETTINGS,
  ...ACADEMY_SETTINGS,
  ...SALES_SETTINGS,
  ...CONFIG_SETTINGS,
} as const satisfies Record<string, SettingDef>;

type Registry = typeof SETTINGS_REGISTRY;
export type SettingKey = keyof Registry;

/** GET /settings (admin): every setting with its default filled in. */
export type AcademySettings = { -readonly [K in SettingKey]: SettingValue<Registry[K]> };

/** PATCH /settings body: camelCase fields, only the ones that change. */
export type SettingsUpdate = { [K in SettingKey as CamelKey<K>]?: AcademySettings[K] };
export type SettingField = keyof SettingsUpdate;

export const SETTING_KEYS = Object.keys(SETTINGS_REGISTRY) as SettingKey[];

export const settingDef = (key: SettingKey): SettingDef => SETTINGS_REGISTRY[key];

/** camelCase field ↔ snake_case key, both directions, from the registry. */
export const SETTING_FIELD_OF = Object.fromEntries(SETTING_KEYS.map((k) => [k, camelKey(k)])) as {
  [K in SettingKey]: CamelKey<K>;
};
export const SETTING_KEY_OF = Object.fromEntries(SETTING_KEYS.map((k) => [camelKey(k), k])) as Record<
  SettingField,
  SettingKey
>;

/** A default safe to share: lists are copied, objects (academy_contact...) frozen so a caller never mutates the registry. */
function defaultOf(key: SettingKey): AcademySettings[SettingKey] {
  const d: unknown = SETTINGS_REGISTRY[key].default;
  const v = Array.isArray(d) ? [...d] : d !== null && typeof d === 'object' ? Object.freeze({ ...d }) : d;
  return v as AcademySettings[SettingKey];
}

/** Used when a row is missing or malformed; the migrations seed the same values. */
export const SETTING_DEFAULTS = Object.fromEntries(SETTING_KEYS.map((k) => [k, defaultOf(k)])) as AcademySettings;

/** 'buttons' = lesson_rating after a completed lesson; 'link' = no automatic message (migration 195). */
export const FEEDBACK_MODES = SETTINGS_REGISTRY.feedback_mode.options;
export type FeedbackMode = AcademySettings['feedback_mode'];

/** Is this row key one of the registry's settings? (A custom entry may not reuse one.) */
export const isSettingKey = (key: string): key is SettingKey => Object.hasOwn(SETTINGS_REGISTRY, key);
