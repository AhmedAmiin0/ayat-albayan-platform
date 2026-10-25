import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { DeviceEventEmitter, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { detail, inbound, thread } from '../shared/thread-fixtures';
import { ThreadScreen } from './ThreadScreen';

// The owner's Android sales chat (2026-10-25): the composer was under the keyboard. A 400 × 800
// window, 32pt status bar, 48pt navigation bar; the chat body starts under the status bar.
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const metrics = { frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 32, bottom: 48, left: 0, right: 0 } };
const KEYBOARD = 280;
const os = Platform.OS;
afterEach(() => {
  Platform.OS = os;
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

async function keyboard(name: string, screenY: number) {
  const endCoordinates = { screenX: 0, screenY, width: 400, height: 800 - 48 - screenY };
  await act(async () => {
    DeviceEventEmitter.emit(name, { endCoordinates, duration: 0, easing: 'keyboard' });
    await Promise.resolve();
  });
}

test('the composer is inside the frame that clears the keyboard, with the list above it', async () => {
  const frame = await open();
  expect(within(frame).getByLabelText(t.inbox.composer.placeholder)).toBeTruthy();
  expect(within(frame).getByText(inbound.body ?? '')).toBeTruthy();
});

test('Android, keyboard open: the composer’s bottom sits on the keyboard’s top, closed: no gap', async () => {
  Platform.OS = 'android';
  const frame = await open();
  expect(frame).toHaveStyle({ paddingBottom: 0 });
  // ReactRootView: screenY = the visible frame's bottom, the keyboard's top above the bar.
  await keyboard('keyboardDidShow', 800 - 48 - KEYBOARD);
  expect(frame).toHaveStyle({ paddingBottom: KEYBOARD });
  await keyboard('keyboardDidHide', 800);
  expect(frame).toHaveStyle({ paddingBottom: 0 });
});

test('iOS: the keyboard covers the home indicator too, so the frame pads the rest of it', async () => {
  Platform.OS = 'ios';
  const frame = await open();
  await keyboard('keyboardWillShow', 800 - 336);
  expect(frame).toHaveStyle({ paddingBottom: 336 - 48 });
  await keyboard('keyboardWillHide', 800);
  expect(frame).toHaveStyle({ paddingBottom: 0 });
});
