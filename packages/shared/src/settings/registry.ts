import { camelKey, type CamelKey } from './camel.js';
import type { SettingDef, SettingsOf } from './defs.js';
import { ACADEMY_SETTINGS } from './domains/academy.js';
import { ACTIVITY_SETTINGS } from './domains/activity.js';
import { CLASSROOM_SETTINGS } from './domains/teaching/classroom.js';
import { FEEDBACK_SETTINGS } from './domains/feedback.js';
import { FINANCE_SETTINGS } from './domains/finance/finance.js';
import { FOLLOW_UP_SETTINGS } from './domains/follow-ups.js';
import { MESSAGING_SETTINGS } from './domains/messaging.js';
import { NOTIFICATION_SETTINGS } from './domains/notifications.js';
import { PAYOUT_SETTINGS } from './domains/finance/payouts.js';
import { RECORDING_SETTINGS } from './domains/teaching/recordings.js';
import { REPORT_SETTINGS } from './domains/teaching/reports.js';
import { SALES_SETTINGS } from './domains/sales.js';
import { SCHEDULING_SETTINGS } from './domains/teaching/scheduling.js';
import { SUBSCRIPTION_SETTINGS } from './domains/finance/subscriptions.js';
import { UPLOAD_SETTINGS } from './domains/uploads.js';

/**
 * Every academy setting (public.settings rows), one domain file per owner (the order here is not
 * the page's: layout.ts places each key on /admin/settings). Add a key to its domain file (with its
 * i18n label, its place in SETTINGS_LAYOUT and a seeding migration) and the PATCH schema, the read
 * validators, the defaults, the AcademySettings type and the admin field all follow.
 */
export const SETTINGS_REGISTRY = {
  ...MESSAGING_SETTINGS,
  ...NOTIFICATION_SETTINGS,
  ...FOLLOW_UP_SETTINGS,
  ...FEEDBACK_SETTINGS,
  ...SCHEDULING_SETTINGS,
  ...CLASSROOM_SETTINGS,
  ...RECORDING_SETTINGS,
  ...REPORT_SETTINGS,
  ...SUBSCRIPTION_SETTINGS,
  ...PAYOUT_SETTINGS,
  ...FINANCE_SETTINGS,
  ...UPLOAD_SETTINGS,
  ...ACADEMY_SETTINGS,
  ...SALES_SETTINGS,
  ...ACTIVITY_SETTINGS,
} as const satisfies Record<string, SettingDef>;

type Registry = typeof SETTINGS_REGISTRY;
export type SettingKey = keyof Registry;

/** GET /settings (admin): every setting with its default filled in. */
export type AcademySettings = SettingsOf<Registry>;

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

/** Is this row key one of the registry's settings? (A custom entry may not reuse one.) */
export const isSettingKey = (key: string): key is SettingKey => Object.hasOwn(SETTINGS_REGISTRY, key);
