import type { GoogleSyncSettings } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';

/** The chip after the module-owned groups: «مزامنة Google», read from GET /admin/google/status. */
export const GOOGLE_GROUP = 'google';

export interface GoogleValue {
  label: string;
  value: string;
}

/**
 * «مزامنة Google»'s three values as the web's «القيم» shows them (GoogleValueRow): the switch, the
 * mode and the calendar window; «—» before the status loads. Read-only: edited on its own page.
 */
export function googleValues(s: GoogleSyncSettings | undefined): GoogleValue[] {
  const gs = t.googleSync.switches;
  const none = '—';
  return [
    { label: gs.enabled, value: s ? (s.enabled ? gs.on : gs.off) : none },
    { label: gs.mode, value: s ? (s.mode === 'live' ? gs.live : gs.dryRun) : none },
    { label: gs.window, value: s ? t.settingsValues.units.days.other.replace('{n}', String(s.window_days)) : none },
  ];
}
