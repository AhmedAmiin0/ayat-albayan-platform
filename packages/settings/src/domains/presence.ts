import type { SettingDef } from '../defs.js';

/** Off (docs/33): no last seen written or shown; Realtime refuses a track (migration 985). */
export const PRESENCE_SETTINGS = {
  presence_enabled: {
    module: 'presence',
    group: 'messaging',
    reachesFamilies: true,
    type: 'bool',
    default: true,
    labelKey: 'settings.presenceEnabled',
    hintKey: 'settings.hints.presenceEnabled',
  },
} as const satisfies Record<string, SettingDef>;
