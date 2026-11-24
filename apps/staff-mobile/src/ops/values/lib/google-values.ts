import type { GoogleSyncSettings } from '@ab/catalog';
import { t } from '@ab/mobile-kit';

/** Read from GET /admin/google/status. */
export const GOOGLE_GROUP = 'google';

interface GoogleValue {
  label: string;
  value: string;
}

/** Read-only, edited on its own page; a dash shows before the status loads. */
export function googleValues(s: GoogleSyncSettings | undefined): GoogleValue[] {
  const gs = t.googleSync.switches;
  const none = '—';
  return [
    { label: gs.enabled, value: s ? (s.enabled ? gs.on : gs.off) : none },
    { label: gs.mode, value: s ? (s.mode === 'live' ? gs.live : gs.dryRun) : none },
    { label: gs.window, value: s ? t.settingsValues.units.days.other.replace('{n}', String(s.window_days)) : none },
  ];
}
