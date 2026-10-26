// Old links to the single /admin/settings page keep working (docs/26 §4, docs/26b §1): each old
// anchor maps to the page that now holds that section. No message is shown; the hub replaces the
// history entry, so «رجوع» does not bounce back to the hub.

const BASE = '/admin/settings';
const COMMS = `${BASE}/communications`;
const INTEGRATIONS = `${BASE}/integrations`;
const values = (group: string): string => `${BASE}/values?group=${group}`;

/** The old `#settings-<group>` sections whose rows now live in a group of «القيم». */
const VALUE_SECTIONS: ReadonlySet<string> = new Set(['schedule', 'classroom', 'reports', 'accounts', 'uploads', 'academy', 'sales']);

/** `?a=b` from `a=b`, `?a=b` or '' (never a lone «?»). */
const queryOf = (search: string): string => {
  const q = search.startsWith('?') ? search.slice(1) : search;
  return q === '' ? '' : `?${q}`;
};

function sectionTarget(section: string): string | null {
  if (section === 'messaging') return COMMS;
  if (section === 'numbers') return `${COMMS}?tab=numbers`;
  if (section === 'appearance') return `${BASE}/appearance`;
  if (section === 'custom') return values('custom');
  return VALUE_SECTIONS.has(section) ? values(section) : null;
}

/**
 * Where an old `/admin/settings#…` link goes now, or null to stay on the hub. `#integrations` (the
 * Google OAuth return: `?google=connected#integrations`) keeps its query string verbatim, so the
 * integrations page can pass `?google=…` on to «مزامنة Google».
 */
export function legacySettingsTarget(hash: string, search: string): string | null {
  const anchor = hash.startsWith('#') ? hash.slice(1) : hash;
  if (anchor === 'integrations' || anchor === 'settings-integrations') return `${INTEGRATIONS}${queryOf(search)}`;
  if (!anchor.startsWith('settings-')) return null;
  return sectionTarget(anchor.slice('settings-'.length));
}
