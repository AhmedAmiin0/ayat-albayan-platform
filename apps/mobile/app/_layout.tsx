import { NotoSansArabic_400Regular } from '@expo-google-fonts/noto-sans-arabic/400Regular';
import { NotoSansArabic_500Medium } from '@expo-google-fonts/noto-sans-arabic/500Medium';
import { NotoSansArabic_600SemiBold } from '@expo-google-fonts/noto-sans-arabic/600SemiBold';
import { NotoSansArabic_700Bold } from '@expo-google-fonts/noto-sans-arabic/700Bold';
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

// Bundled files: Noto Sans Arabic for everything, titles at 700 (owner, 2026-10-05); names match theme.type.
const fonts = {
  NotoSansArabic_400Regular,
  NotoSansArabic_500Medium,
  NotoSansArabic_600SemiBold,
  NotoSansArabic_700Bold,
};

/**
 * Fonts + language + session gate, then one stack: admins get (tabs), teachers get /teacher (their
 * own lessons, chats, reports and payouts; a real segment, so its tabs never share a URL with the
 * admin's), everyone else only /login.
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
            <Stack.Protected guard={gate === 'teacher'}>
              <Stack.Screen name="teacher" />
            </Stack.Protected>
            <Stack.Protected guard={gate === 'out'}>
              <Stack.Screen name="login" />
            </Stack.Protected>
          </Stack>
        </>
      ) : null}
    </PersistQueryClientProvider>
  );
}
