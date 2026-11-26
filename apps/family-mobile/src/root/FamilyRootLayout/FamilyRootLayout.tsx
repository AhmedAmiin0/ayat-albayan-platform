import { Stack } from 'expo-router';
import {
  BiometricGate,
  type GateStatus,
  useAuthGate,
  useMeReady,
  useProfileLocaleSync,
  type RootBoot,
  RootFrame,
  RootProviders,
  useRootBoot,
  useTheme,
} from '@ab/mobile-kit';
import { useFamilyCodes } from '@/sign-in';
import { isFamilySignedIn } from '@/root/family-gate';
import { ROOM_CHAT_SCREEN, ROOM_SCREEN } from '@/root/room-screen';
import { screenAnimation } from '@/root/screen-animation';
import { useFamilyPush } from '@/root/use-family-push';

/** docs/50 §7: staff are signed out by the gate with the inverted wrongApp notice. */
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
  // The login's own language (profiles.locale): a different one switches the app (reload).
  useProfileLocaleSync(ready && signedIn);
  return (
    <RootFrame ready={ready} fontsLoaded={boot.fontsLoaded}>
      <BiometricGate signedIn={signedIn}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: screenAnimation(),
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
            <Stack.Screen name="recordings/[id]" />
            <Stack.Screen name="lesson/[id]" />
            <Stack.Screen name="alerts" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="pick-child" />
            <Stack.Screen name="room/[id]" options={ROOM_SCREEN} />
            <Stack.Screen name="room-chat/[id]" options={ROOM_CHAT_SCREEN} />
          </Stack.Protected>
          <Stack.Protected guard={gate === 'out'}>
            <Stack.Screen name="login" />
          </Stack.Protected>
        </Stack>
      </BiometricGate>
    </RootFrame>
  );
}
