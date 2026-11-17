import { Stack } from 'expo-router';
import { useEffect } from 'react';
import {
  BiometricGate,
  type GateStatus,
  useAuthGate,
  useMeId,
  useMeReady,
  RootFrame,
  RootProviders,
  useProfileLocaleSync,
  useRootBoot,
  useTheme,
} from '@ab/mobile-kit';
import { usePresenceSelf } from '@/core/lib/presence';
import { ROOM_CHAT_SCREEN, ROOM_SCREEN } from '@/core/root';
import { clearInboxOnSignOut, StaffCalls } from '@/inbox';

/**
 * Fonts + language + translation overrides + session gate (useRootBoot), then one stack: admins
 * (tabs), teachers /teacher (a real segment: no URL shared with the admin's), sales /sales, the
 * classroom assistant /assistant, everyone else /login. Each tree's chat group
 * (react-native-screens#4132, no URL segment) sits in its guard, after it. Stack.Protected moves it
 * on a gate flip; screens read useRootGate. The family app is apps/family-mobile (docs/50).
 */
export default function RootLayout() {
  const gate = useAuthGate();
  const boot = useRootBoot(gate);
  // Signed out: the chats' unsent drafts (and a pending search ask) go with the session (kept until then, review 2026-10-29 #4).
  useEffect(() => {
    if (gate === 'out') clearInboxOnSignOut(); // and the phone's message store (docs/43 43-7)
  }, [gate]);
  return (
    <RootProviders gate={gate}>
      <GatedRoot gate={gate} settled={boot.settled} fontsLoaded={boot.fontsLoaded} />
    </RootProviders>
  );
}

interface GatedRootProps {
  gate: GateStatus;
  /** Fonts, language, overrides and the session gate are settled. */
  settled: boolean;
  fontsLoaded: boolean;
}

/**
 * The room (docs/35: a lesson or meeting inside the app) is open to every signed-in tree, and so is
 * /share (docs/38: an Android share), which replaces itself at once with the tree's own chooser.
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
  // The login's language (/auth/me `locale`) wins over this phone's copy: a switch reloads.
  useProfileLocaleSync(signedIn);
  return (
    <RootFrame ready={ready} fontsLoaded={fontsLoaded}>
      {/* «الدخول بالبصمة»: off by default, nothing changes until the user turns it on. */}
      <BiometricGate signedIn={signedIn}>
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
              <Stack.Screen name="room-chat/[studentId]" options={ROOM_CHAT_SCREEN} />
              <Stack.Screen name="share" />
            </Stack.Protected>
            <Stack.Protected guard={gate === 'out'}>
              <Stack.Screen name="login" />
            </Stack.Protected>
          </Stack>
        </StaffCalls>
      </BiometricGate>
    </RootFrame>
  );
}
