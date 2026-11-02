import type { SettingDef } from '../defs.js';

/**
 * «متصل الآن» / «آخر ظهور» (owner 2026-10-30, docs/33). Off: the API writes no last seen and shows
 * none, the apps neither track nor watch, and the Realtime policy refuses a track (migration 985).
 */
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
