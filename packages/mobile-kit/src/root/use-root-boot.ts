import { NotoSansArabic_400Regular } from '@expo-google-fonts/noto-sans-arabic/400Regular';
import { NotoSansArabic_500Medium } from '@expo-google-fonts/noto-sans-arabic/500Medium';
import { NotoSansArabic_600SemiBold } from '@expo-google-fonts/noto-sans-arabic/600SemiBold';
import { NotoSansArabic_700Bold } from '@expo-google-fonts/noto-sans-arabic/700Bold';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import type { GateStatus } from '../auth/use-auth-gate';
import { useOverridesReady } from '../lib/i18n/i18n-overrides';
import { useLocaleReady } from '../lib/i18n/locale-switch';
import { restoreAppearance } from '../lib/appearance/appearance';

// Bundled files: Noto Sans Arabic for everything, titles at 700; names match
// theme.type.
const fonts = {
  NotoSansArabic_400Regular,
  NotoSansArabic_500Medium,
  NotoSansArabic_600SemiBold,
  NotoSansArabic_700Bold,
};

export interface RootBoot {
  /** Fonts, language, overrides and the session gate are settled. */
  settled: boolean;
  fontsLoaded: boolean;
}

/**
 * What every app's root waits for before its first screen (the staff app and the family app,
 * docs/50 §7): fonts + language + translation overrides + the session gate.
 */
export function useRootBoot(gate: GateStatus): RootBoot {
  const [loaded, error] = useFonts(fonts);
  // The saved language before any screen: a mismatch reloads, so nothing paints in the wrong one.
  const localeReady = useLocaleReady();
  // The admins' translation overrides saved by the last run, in `t` before the first screen.
  const overridesReady = useOverridesReady();
  // Re-applies the saved light/dark override while fonts and the session load.
  useEffect(() => {
    void restoreAppearance();
  }, []);
  // On a font error fall through: the system Arabic font is better than a blank app.
  const ready = (loaded || error) && localeReady && overridesReady && gate !== 'booting';
  return { settled: Boolean(ready), fontsLoaded: loaded };
}
