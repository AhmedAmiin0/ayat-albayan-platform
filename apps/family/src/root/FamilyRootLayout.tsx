import { Stack } from 'expo-router';
import {
  type GateStatus,
  useAuthGate,
  useMeReady,
  type RootBoot,
  RootFrame,
  RootProviders,
  useRootBoot,
  useTheme,
} from '@ab/mobile-kit';
import { familyBrand } from './family-brand';
import { isFamilySignedIn } from './family-gate';
import { useFamilyPush } from './use-family-push';

/** Native slide between the family screens (docs/50 §6: smooth transitions). */
const SCREEN_ANIMATION = 'slide_from_right';

/**
 * The family app's root (app/_layout, docs/50 §7): the shared boot, providers and frame
 * (@ab/mobile-kit), one stack. A guardian or a student gets home, a child's page and settings;
 * everyone else the sign-in. Staff are signed out by the gate with the inverted «wrongApp» notice
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
  const ready = boot.settled && meReady;
  useFamilyPush(ready && signedIn);
  return (
    <RootFrame ready={ready} fontsLoaded={boot.fontsLoaded} brand={familyBrand()}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: SCREEN_ANIMATION,
          contentStyle: { backgroundColor: color.margin },
        }}
      >
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="index" />
          <Stack.Screen name="child/[id]" />
          <Stack.Screen name="settings" />
        </Stack.Protected>
        <Stack.Protected guard={gate === 'out'}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    </RootFrame>
  );
}
