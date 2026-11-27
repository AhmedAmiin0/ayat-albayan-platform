import { Stack } from 'expo-router';
import { BiometricGate, RootFrame, useTheme } from '@ab/mobile-kit';
import { ROOM_CHAT_SCREEN, ROOM_SCREEN } from '@/root/room-screen';
import { screenAnimation } from '@/root/screen-animation';
import type { FamilyStackProps } from './FamilyStack.types';
import { useFamilyStack } from './use-family-stack';

export function FamilyStack({ gate, boot }: FamilyStackProps) {
  const { color } = useTheme();
  const { signedIn, ready } = useFamilyStack({ gate, boot });
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
