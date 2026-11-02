/**
 * The public.settings rows google-sync owns outside the settings registry (seeded by migration
 * 20261022000610): GET/PATCH /settings never list them; PUT /admin/google/settings writes them.
 */
export const GOOGLE_SETTING_KEYS = {
  enabled: 'google_sync_enabled',
  mode: 'google_sync_mode',
  window_days: 'google_calendar_window_days',
} as const;

export type GoogleSettingKey = (typeof GOOGLE_SETTING_KEYS)[keyof typeof GOOGLE_SETTING_KEYS];
