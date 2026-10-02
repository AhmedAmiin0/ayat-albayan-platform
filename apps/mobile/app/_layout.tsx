import { Amiri_700Bold } from '@expo-google-fonts/amiri/700Bold';
import { IBMPlexSansArabic_400Regular } from '@expo-google-fonts/ibm-plex-sans-arabic/400Regular';
import { IBMPlexSansArabic_500Medium } from '@expo-google-fonts/ibm-plex-sans-arabic/500Medium';
import { IBMPlexSansArabic_600SemiBold } from '@expo-google-fonts/ibm-plex-sans-arabic/600SemiBold';
import { IBMPlexSansArabic_700Bold } from '@expo-google-fonts/ibm-plex-sans-arabic/700Bold';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAuthGate } from '@/auth/use-auth-gate';
import { useLocaleReady } from '@/lib/locale-switch';
import { persistOptions, queryClient } from '@/lib/query-client';
import { restoreAppearance } from '@/more/appearance';
import { useTheme } from '@/theme';

// Bundled files (docs/07 §2: Amiri 700 for titles, Plex for everything else); names match theme.type.
const fonts = {
  Amiri_700Bold,
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
};

/**
 * Fonts + language + session gate, then one stack: admins get (tabs), everyone else only /login.
 * When the gate flips, Stack.Protected moves the screen by itself: no screen navigates after sign-in/out.
 */
export default function RootLayout() {
  const [loaded, error] = useFonts(fonts);
  const gate = useAuthGate();
  // The saved language before any screen: a mismatch reloads, so nothing paints in the wrong one.
  const localeReady = useLocaleReady();
  const { color } = useTheme();
  // «المظهر»: the saved light/dark override, re-applied while fonts and the session load.
  useEffect(() => {
    void restoreAppearance();
  }, []);
  // On a font error fall through: the system Arabic font is better than a blank app.
  const ready = (loaded || error) && localeReady && gate !== 'booting';
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      {ready ? (
        <>
          <StatusBar style="auto" />
          <Stack
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.margin } }}
          >
            <Stack.Protected guard={gate === 'admin'}>
              <Stack.Screen name="(tabs)" />
            </Stack.Protected>
            <Stack.Protected guard={gate !== 'admin'}>
              <Stack.Screen name="login" />
            </Stack.Protected>
          </Stack>
        </>
      ) : null}
    </PersistQueryClientProvider>
  );
}
