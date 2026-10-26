import type { Json } from '@ab/db';
import { PUBLIC_SETTING_DEFAULTS, type PublicSettings } from '../settings/public.js';

// GET /settings/public (no login): the composite read model the apps load before and after login.
// It joins two stores one way: the public settings (registry) and the public custom values.

/** GET /settings/public: the public settings by row key, plus `custom`: the entries flagged public. */
export type PublicConfig = PublicSettings & { custom: Record<string, Json> };

export const PUBLIC_CONFIG_PATH = '/settings/public';
/** The clients' React Query key (web and mobile); the admin's save invalidates it. */
export const PUBLIC_CONFIG_QUERY_KEY = ['settings', 'public'] as const;
/** Kept 5 minutes on the clients. */
export const PUBLIC_CONFIG_STALE_MS = 300_000;

/** The public settings, never undefined: the registry defaults until the API answers (or if it fails). */
export function withPublicDefaults(data: PublicConfig | undefined): PublicSettings {
  return { ...PUBLIC_SETTING_DEFAULTS, ...data };
}
