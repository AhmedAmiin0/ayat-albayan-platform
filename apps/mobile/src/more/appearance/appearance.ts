import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

// «المظهر» (تلقائي / فاتح / ليلي). The override is the OS one, Appearance.setColorScheme: useTheme()
// reads useColorScheme(), which follows it, and so do the status bar, alerts and the keyboard.
// It does not survive a restart, so the choice is saved and re-applied on boot (restoreAppearance).

export type AppearancePref = 'auto' | 'light' | 'dark';
export const APPEARANCE_PREFS: readonly AppearancePref[] = ['auto', 'light', 'dark'];
export const APPEARANCE_KEY = 'appearance';

export function toColorScheme(pref: AppearancePref): 'light' | 'dark' | 'unspecified' {
  return pref === 'auto' ? 'unspecified' : pref;
}

/** The saved choice; missing, unknown or unreadable storage → 'auto' (follow the phone). */
export async function loadAppearance(): Promise<AppearancePref> {
  try {
    const saved = await AsyncStorage.getItem(APPEARANCE_KEY);
    return APPEARANCE_PREFS.find((p) => p === saved) ?? 'auto';
  } catch {
    return 'auto';
  }
}

/** Applies at once, then saves. A failed save only loses the choice on the next restart. */
export async function saveAppearance(pref: AppearancePref): Promise<void> {
  Appearance.setColorScheme(toColorScheme(pref));
  try {
    await AsyncStorage.setItem(APPEARANCE_KEY, pref);
  } catch {
    // Storage full or unavailable: the theme still changed for this session.
  }
}

/** Boot: re-applies a saved light/dark override; 'auto' leaves the OS alone. Returns the choice. */
export async function restoreAppearance(): Promise<AppearancePref> {
  const pref = await loadAppearance();
  if (pref !== 'auto') Appearance.setColorScheme(toColorScheme(pref));
  return pref;
}
