import type { SettingDef } from './defs.js';

const sw = 'googleSync.switches';
const meta = { module: 'google_sync', group: 'google', ownedBy: 'google_sync' } as const;

/**
 * The google-sync rows (docs/24) as seed definitions only: they stay OUT of SETTINGS_REGISTRY (GET and
 * PATCH /settings never list them; PUT /admin/google/settings writes them). src/settings imports nothing
 * from src/google (boundaries.test.ts), so the keys, modes and bounds are written out here and
 * google/seed-defs.test.ts pins them to GOOGLE_SETTING_KEYS, GOOGLE_SYNC_MODES and GOOGLE_WINDOW_DAYS
 * (and so to readGoogleSettings in apps/api google-settings.ts and migration 20261022000610).
 */
export const GOOGLE_SEED_DEFS = {
  google_sync_enabled: {
    ...meta, type: 'bool', default: false, labelKey: `${sw}.enabled`, hintKey: `${sw}.enabledHint`,
  },
  google_sync_mode: {
    ...meta, type: 'enum', default: 'dry_run', options: ['dry_run', 'live'], labelKey: `${sw}.mode`,
  },
  google_calendar_window_days: {
    ...meta, type: 'int', default: 60, min: 7, max: 180, labelKey: `${sw}.window`, hintKey: `${sw}.windowHint`,
  },
} as const satisfies Record<string, SettingDef>;
