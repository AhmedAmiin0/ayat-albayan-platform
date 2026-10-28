import type { CallSession } from '@ab/client-core';
import { avatarTone, avatarTones } from '@ab/shared';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CallScreen } from './CallScreen';
import { IncomingCall } from './IncomingCall';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: jest.fn(() => 'light') }));

const PHONE = '+966500000002';
const SESSION: CallSession = {
  id: 'c1',
  phone: PHONE,
  name: 'أم محمد',
  direction: 'outbound',
  startedAt: 0,
  muted: false,
  speaker: false,
  minimised: false,
  ended: false,
};
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const tone = (): unknown =>
  StyleSheet.flatten(screen.getByTestId('avatar-initials', { includeHiddenElements: true }).props.style).backgroundColor;

// The call screens seed the tone with the number, as the chat rows do: one family, one colour.
test('CallScreen seeds the tone with session.phone', async () => {
  const actions = { hangup: jest.fn(), toggleMute: jest.fn(), toggleSpeaker: jest.fn(), minimise: jest.fn() };
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <CallScreen session={SESSION} row={undefined} phase="ringing" actions={actions} />
    </SafeAreaProvider>,
  );
  expect(tone()).toBe(avatarTones.light[avatarTone(PHONE)]);
});

test('IncomingCall seeds the tone with the caller phone', async () => {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <IncomingCall name="أم محمد" phone={PHONE} onAccept={jest.fn()} onDecline={jest.fn()} />
    </SafeAreaProvider>,
  );
  expect(tone()).toBe(avatarTones.light[avatarTone(PHONE)]);
});
