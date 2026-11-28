import { Stack } from 'expo-router';
import { ObserveInteractiveMarker } from 'expo-observe';
import { BiometricGate, RootFrame, useTheme } from '@ab/mobile-kit';
import { ROOM_CHAT_SCREEN, ROOM_SCREEN } from '@/core/root/room-screen';
import { StaffCalls } from '@/inbox';
import type { StaffStackProps } from './StaffStack.types';
import { useStaffStack } from './use-staff-stack';

/**
 * Each tree's chat group (react-native-screens#4132, no URL segment) sits in its guard, after it.
 * Stack.Protected moves it on a gate flip; screens read useRootGate. The interactive mark comes
 * once a signed-in tree is whole, never on the sign-in screen.
 */
export function StaffStack({ gate, settled, fontsLoaded }: StaffStackProps) {
  const { color } = useTheme();
  const { signedIn, ready, interactive } = useStaffStack({ gate, settled });
  return (
    <RootFrame ready={ready} fontsLoaded={fontsLoaded}>
      {interactive ? <ObserveInteractiveMarker /> : null}
      {/* Fingerprint sign-in is off by default; nothing changes until the user turns it on. */}
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
