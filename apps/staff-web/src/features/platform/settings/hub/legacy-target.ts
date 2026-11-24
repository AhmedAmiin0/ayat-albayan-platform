// Old anchors map to their new pages and replace the history entry (docs/26 §4, docs/26b §1).

const BASE = '/admin/settings';
const COMMS = `${BASE}/communications`;
const INTEGRATIONS = `${BASE}/integrations`;
const values = (group: string): string => `${BASE}/values?group=${group}`;

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

/** `#integrations` keeps its query verbatim so the OAuth return reaches Google sync. */
export function legacySettingsTarget(hash: string, search: string): string | null {
  const anchor = hash.startsWith('#') ? hash.slice(1) : hash;
  if (anchor === 'integrations' || anchor === 'settings-integrations') return `${INTEGRATIONS}${queryOf(search)}`;
  if (!anchor.startsWith('settings-')) return null;
  return sectionTarget(anchor.slice('settings-'.length));
}
