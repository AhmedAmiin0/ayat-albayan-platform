import { NotoSansArabic_400Regular } from '@expo-google-fonts/noto-sans-arabic/400Regular';
import { NotoSansArabic_500Medium } from '@expo-google-fonts/noto-sans-arabic/500Medium';
import { NotoSansArabic_600SemiBold } from '@expo-google-fonts/noto-sans-arabic/600SemiBold';
import { NotoSansArabic_700Bold } from '@expo-google-fonts/noto-sans-arabic/700Bold';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAuthGate } from '@/auth';
import { useOverridesReady } from '@/core/lib/i18n/i18n-overrides';
import { useLocaleReady } from '@/core/lib/i18n/locale-switch';
import { persistOptions, queryClient } from '@/core/lib/query/query-client';
import { restoreAppearance } from '@/more';
import { useTheme } from '@/theme';

// Bundled files: Noto Sans Arabic for everything, titles at 700 (owner, 2026-10-05); names match theme.type.
const fonts = {
  NotoSansArabic_400Regular,
  NotoSansArabic_500Medium,
  NotoSansArabic_600SemiBold,
  NotoSansArabic_700Bold,
};

/**
 * Fonts + language + translation overrides + session gate, then one stack: admins get (tabs),
 * teachers get /teacher (their own lessons, chats, reports and payouts; a real segment, so its tabs never share a URL with the
 * admin's), the salesperson /sales (the web sales portal's pages) and the classroom assistant /assistant
 * (the lessons they assist, internal meetings), everyone else only /login.
 * A tree's chat (and what a chat opens) is its chat group beside it, a full screen above its tabs
 * (react-native-screens#4132); groups add no URL segment, so every link stays the same. Each group
 * sits in its tree's guard (an unlisted route is unprotected), after the tree, which stays first.
 * When the gate flips, Stack.Protected moves the screen by itself: no screen navigates after sign-in/out.
 */
export default function RootLayout() {
  const [loaded, error] = useFonts(fonts);
  const gate = useAuthGate();
  // The saved language before any screen: a mismatch reloads, so nothing paints in the wrong one.
  const localeReady = useLocaleReady();
  // The admins' translation overrides saved by the last run, in `t` before the first screen.
  const overridesReady = useOverridesReady();
  const { color } = useTheme();
  // «المظهر»: the saved light/dark override, re-applied while fonts and the session load.
  useEffect(() => {
    void restoreAppearance();
  }, []);
  // On a font error fall through: the system Arabic font is better than a blank app.
  const ready = (loaded || error) && localeReady && overridesReady && gate !== 'booting';
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
              <Stack.Screen name="(admin-chat)" />
            </Stack.Protected>
            <Stack.Protected guard={gate === 'teacher'}>
              <Stack.Screen name="teacher" />
              <Stack.Screen name="(teacher-chat)" />
            </Stack.Protected>
            <Stack.Protected guard={gate === 'sales'}>
              <Stack.Screen name="sales" />
              <Stack.Screen name="(sales-chat)" />
            </Stack.Protected>
            <Stack.Protected guard={gate === 'assistant'}>
              <Stack.Screen name="assistant" />
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
