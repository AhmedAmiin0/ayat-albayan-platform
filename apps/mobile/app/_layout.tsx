import { NotoSansArabic_400Regular } from '@expo-google-fonts/noto-sans-arabic/400Regular';
import { NotoSansArabic_500Medium } from '@expo-google-fonts/noto-sans-arabic/500Medium';
import { NotoSansArabic_600SemiBold } from '@expo-google-fonts/noto-sans-arabic/600SemiBold';
import { NotoSansArabic_700Bold } from '@expo-google-fonts/noto-sans-arabic/700Bold';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { type GateStatus, retryGate, useAuthGate, useMeId, useMeReady } from '@/auth';
import { connectivity } from '@/core/lib/connectivity/connectivity';
import { usePresenceSelf } from '@/core/lib/presence';
import { useOverridesReady } from '@/core/lib/i18n/i18n-overrides';
import { useLocaleReady } from '@/core/lib/i18n/locale-switch';
import { onCacheRestored, persistOptions, queryClient } from '@/core/lib/query/query-client';
import { pathKey } from '@/core/lib/query/query-keys';
import { TopConnectingBar } from '@/core/ui/connecting/TopConnectingBar';
import { StartupOverlay } from '@/core/ui/startup/StartupOverlay';
import { clearComposerDrafts, StaffCalls } from '@/inbox';
import { restoreAppearance } from '@/more';
import { useTheme } from '@/theme';

// Bundled files: Noto Sans Arabic for everything, titles at 700 (owner, 2026-10-05); names match theme.type.
/** «إعادة المحاولة» on the startup screen: the session and its role again, /auth/me, and the connection now. */
function retryStartup() {
  retryGate();
  void queryClient.refetchQueries({ queryKey: pathKey('/auth/me') });
  connectivity.probeNow();
}

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
 * Until then the branded startup screen lies over it and fades out on the first screen; the
 * reconnecting bar shows under the focused screen's header (ScreenHeader), or above the stack under the
 * top safe area for a screen with none, and pushes the content down while the app has no connection.
 */
export default function RootLayout() {
  const [loaded, error] = useFonts(fonts);
  const gate = useAuthGate();
  // The saved language before any screen: a mismatch reloads, so nothing paints in the wrong one.
  const localeReady = useLocaleReady();
  // The admins' translation overrides saved by the last run, in `t` before the first screen.
  const overridesReady = useOverridesReady();
  // «المظهر»: the saved light/dark override, re-applied while fonts and the session load.
  useEffect(() => {
    void restoreAppearance();
  }, []);
  // Signed out: the chats' unsent drafts go with the session (kept until then, review 2026-10-29 #4).
  useEffect(() => {
    if (gate === 'out') clearComposerDrafts();
  }, [gate]);
  // On a font error fall through: the system Arabic font is better than a blank app.
  const ready = (loaded || error) && localeReady && overridesReady && gate !== 'booting';
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      onSuccess={onCacheRestored}
      onError={onCacheRestored}
    >
      <GatedRoot gate={gate} settled={Boolean(ready)} fontsLoaded={loaded} />
    </PersistQueryClientProvider>
  );
}

/** The in-app room (docs/35) covers the tabs and is left only by its own «غادر» / «رجوع». */
const ROOM_SCREEN = { presentation: 'fullScreenModal', gestureEnabled: false } as const;

interface GatedRootProps {
  gate: GateStatus;
  /** Fonts, language, overrides and the session gate are settled. */
  settled: boolean;
  fontsLoaded: boolean;
}

/**
 * The room (docs/35: a lesson or meeting inside the app) is open to every signed-in tree.
 * Inside the query provider, so the persisted /auth/me counts: a signed-in tree mounts only once
 * /auth/me is loaded (saved or live), and its tab bar renders once, complete (docs/27 E2, D6). Until
 * then «جارٍ الاتصال» stays up; useMeReady fetches /auth/me meanwhile.
 */
function GatedRoot({ gate, settled, fontsLoaded }: GatedRootProps) {
  const { color } = useTheme();
  const signedIn = gate !== 'booting' && gate !== 'out';
  const meReady = useMeReady(signedIn);
  const ready = settled && meReady;
  // Online now for the others (docs/33 §1.1), in every tree, while the app is open.
  usePresenceSelf(useMeId(ready && signedIn));
  return (
    <>
      {ready ? (
        <View style={{ flex: 1, backgroundColor: color.margin }}>
          <StatusBar style="auto" />
          <TopConnectingBar />
          <StaffCalls gate={gate}>
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
              {/* Back from Stripe into the app (pay-return): whoever makes payment links. */}
              <Stack.Protected guard={gate === 'admin' || gate === 'sales'}>
                <Stack.Screen name="pay-done" />
              </Stack.Protected>
              <Stack.Protected guard={gate === 'assistant'}>
                <Stack.Screen name="assistant" />
              </Stack.Protected>
              <Stack.Protected guard={signedIn}>
                <Stack.Screen name="room/[kind]/[id]" options={ROOM_SCREEN} />
              </Stack.Protected>
              <Stack.Protected guard={gate === 'out'}>
                <Stack.Screen name="login" />
              </Stack.Protected>
            </Stack>
          </StaffCalls>
        </View>
      ) : null}
      <StartupOverlay ready={ready} onRetry={retryStartup} fontsLoaded={fontsLoaded} />
    </>
  );
}
