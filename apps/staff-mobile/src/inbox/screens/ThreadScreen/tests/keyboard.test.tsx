import { fireEvent, screen, within } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { t } from '@ab/mobile-kit';
import { keyboardAt } from '@ab/mobile-kit/testing';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { detail, inbound, thread } from '@/inbox/shared/thread-fixtures';
import { ThreadScreen } from '@/inbox/screens/ThreadScreen/ThreadScreen';

// The owner's Android sales chat (2026-10-25): the composer was under the keyboard. A 400 × 800
// window, 32pt status bar, 48pt navigation bar; the chat body starts under the status bar.
const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 32, bottom: 48, left: 0, right: 0 },
};
const KEYBOARD = 280;
const os = Platform.OS;
afterEach(async () => {
  Platform.OS = os;
  await keyboardAt(null);
});

async function open() {
  mockApiFetch.mockImplementation(async (p: string) =>
    p === '/messages/gate' ? { open: true, reason: null, queued: 0 } : detail([inbound], { thread: { ...thread, last_inbound_at: new Date().toISOString() } }),
  );
  await renderWithQuery(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThreadScreen />
    </SafeAreaProvider>,
    createTestQueryClient(),
  );
  await screen.findByText(inbound.body ?? '');
  const frame = screen.getByTestId('keyboard-frame');
  // Under the 60pt header line the frame runs to the navigation bar: 32 + 60 + 660 = 800 − 48.
  const layout = { x: 0, y: 60, width: 400, height: 660 };
  await fireEvent(frame, 'layout', { persist: () => undefined, nativeEvent: { layout } });
  return frame;
}

test('the composer is inside the frame that clears the keyboard, with the list above it', async () => {
  const frame = await open();
  expect(within(frame).getByLabelText(t.inbox.composer.placeholder)).toBeTruthy();
  expect(within(frame).getByText(inbound.body ?? '')).toBeTruthy();
});

// The keyboard's top in window points, as the library reports it on both platforms; it moves the
// frame with the keyboard (React Native's own padded only after Android's keyboardDidShow).
const PLATFORMS = ['android', 'ios'] as const;
test.each(PLATFORMS)('%s: the composer sits on the keyboard, closed: no gap', async (os) => {
  Platform.OS = os;
  const frame = await open();
  expect(frame).toHaveStyle({ paddingBottom: 0 });
  await keyboardAt(800 - 48 - KEYBOARD);
  expect(frame).toHaveStyle({ paddingBottom: KEYBOARD });
  await keyboardAt(null);
  expect(frame).toHaveStyle({ paddingBottom: 0 });
});

test('iOS: the keyboard covers the home indicator too, so the frame pads the rest of it', async () => {
  Platform.OS = 'ios';
  const frame = await open();
  await keyboardAt(800 - 336);
  expect(frame).toHaveStyle({ paddingBottom: 336 - 48 });
});
