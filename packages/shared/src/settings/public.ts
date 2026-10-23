import { SETTING_DEFAULTS, SETTING_KEYS, SETTINGS_REGISTRY, type AcademySettings, type SettingKey } from './registry.js';

type Registry = typeof SETTINGS_REGISTRY;
/** The keys marked `public: true`: safe for anyone (public pages, the apps before login). */
export type PublicSettingKey = { [K in SettingKey]: Registry[K] extends { public: true } ? K : never }[SettingKey];

/** GET /settings/public (no login). */
export type PublicSettings = Pick<AcademySettings, PublicSettingKey>;

export const PUBLIC_SETTING_KEYS = SETTING_KEYS.filter(
  (k) => (SETTINGS_REGISTRY[k] as { public?: boolean }).public === true,
) as PublicSettingKey[];

/** Only the public keys of a full settings object. */
export function publicSettings(all: AcademySettings): PublicSettings {
  return Object.fromEntries(PUBLIC_SETTING_KEYS.map((k) => [k, all[k]])) as PublicSettings;
}

/** What the clients use until GET /settings/public answers (and if it fails). */
export const PUBLIC_SETTING_DEFAULTS: PublicSettings = publicSettings(SETTING_DEFAULTS);
