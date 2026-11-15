// Theme preference (docs/07 §3). The boot script in index.html applies it before first paint;
// this module changes it at runtime. Keep THEME_KEY in sync with index.html.

export type ThemePref = 'auto' | 'light' | 'dark';
export type Theme = 'light' | 'dark';
export const THEME_KEY = 'ayat-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Stored choice; anything missing, unknown or unreadable (private mode) is "auto". */
export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

export function resolveTheme(pref: ThemePref, prefersDark: boolean): Theme {
  if (pref === 'auto') return prefersDark ? 'dark' : 'light';
  return pref;
}

/** Saves the choice ("auto" clears it) and sets <html data-theme> to the resolved theme. */
export function setThemePref(pref: ThemePref): void {
  try {
    if (pref === 'auto') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {
    // storage blocked: the choice still applies for this page view
  }
  document.documentElement.setAttribute('data-theme', resolveTheme(pref, systemPrefersDark()));
}

/** Follows OS light/dark switches live while the preference is "auto". */
export function watchSystemTheme(): void {
  if (typeof window.matchMedia !== 'function') return;
  window.matchMedia(DARK_QUERY).addEventListener('change', () => {
    if (readThemePref() === 'auto') setThemePref('auto');
  });
}
