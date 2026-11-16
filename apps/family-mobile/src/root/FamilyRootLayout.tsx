import { Stack } from 'expo-router';
import {
  BiometricGate,
  type GateStatus,
  useAuthGate,
  useMeReady,
  type RootBoot,
  RootFrame,
  RootProviders,
  useRootBoot,
  useTheme,
} from '@ab/mobile-kit';
import { useFamilyCodes } from '@/sign-in';
import { isFamilySignedIn } from './family-gate';
import { useFamilyPush } from './use-family-push';

/** Native slide between the family screens (docs/50 §6: smooth transitions). */
const SCREEN_ANIMATION = 'slide_from_right';

/**
 * The family app's root (app/_layout, docs/50 §7): the shared boot, providers and frame
 * (@ab/mobile-kit), one stack. A guardian or a student gets the tabs (home, schedule, reports,
 * account), the pushed child, chat, report, package and alerts, and «اختر الطالب» (pick-child)
 * for a guardian of several children; everyone else the sign-in.
 * Staff are signed out by the gate with the inverted «wrongApp» notice
 * (role-claim / login-notice follow the app's audience, set in index.ts).
 */
export function FamilyRootLayout() {
  const gate = useAuthGate();
  const boot = useRootBoot(gate);
  return (
    <RootProviders gate={gate}>
      <FamilyStack gate={gate} boot={boot} />
    </RootProviders>
  );
}

function FamilyStack({ gate, boot }: { gate: GateStatus; boot: RootBoot }) {
  const { color } = useTheme();
  const signedIn = isFamilySignedIn(gate);
  // Inside the query provider: the persisted /auth/me counts (docs/27 E2).
  const meReady = useMeReady(signedIn);
  // Signed out, the sign-in opens on WhatsApp or the password by GET /auth/code/status: the cover
  // waits for it, so the first screen is whole when it materializes (no form popping in).
  const codesKnown = useFamilyCodes() !== undefined;
  const ready = boot.settled && meReady && (signedIn || codesKnown);
  useFamilyPush(ready && signedIn);
  return (
    <RootFrame ready={ready} fontsLoaded={boot.fontsLoaded}>
      <BiometricGate signedIn={signedIn}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: SCREEN_ANIMATION,
            contentStyle: { backgroundColor: color.margin },
          }}
        >
          <Stack.Protected guard={signedIn}>
            {/* The tabs, then the screens pushed above them (no tab bar: rn-screens#4132). */}
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="child/[id]" />
            <Stack.Screen name="chat/[id]" />
            <Stack.Screen name="report/[id]" />
            <Stack.Screen name="package/[id]" />
            <Stack.Screen name="alerts" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="pick-child" />
          </Stack.Protected>
          <Stack.Protected guard={gate === 'out'}>
            <Stack.Screen name="login" />
          </Stack.Protected>
        </Stack>
      </BiometricGate>
    </RootFrame>
  );
}
