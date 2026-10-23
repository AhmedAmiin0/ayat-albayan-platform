import type { SettingDef } from '../defs.js';

/** «سجل النشاط»: how long the activity log is kept (custom-config request, 2026-10-05). */
export const ACTIVITY_SETTINGS = {
  /**
   * Read by SQL prune_activity_log() (migration 20261005000250) with its own fallback; the old fixed
   * value was 180. A default change needs a migration too.
   */
  activity_retention_days: {
    type: 'int', default: 180, min: 1, max: 3650,
    labelKey: 'config.activityRetentionDays', hintKey: 'config.activityRetentionDaysHint',
  },
} as const satisfies Record<string, SettingDef>;
