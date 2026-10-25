import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { DeviceEventEmitter, Platform, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardFrame, keyboardAvoidProps } from './KeyboardFrame';

// A 400 × 800 window, 40pt status bar, 24pt navigation bar / home indicator; the frame's parent (the
// Screen body) starts under the status bar, and the frame ends at 736 = 800 − 24 − 40 in it.
const metrics = { frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 40, bottom: 24, left: 0, right: 0 } };
const KEYBOARD = 300;

async function frame(inScreen = true) {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <KeyboardFrame style={{ flex: 1 }} inScreen={inScreen}>
        <Text>composer</Text>
      </KeyboardFrame>
    </SafeAreaProvider>,
  );
  const view = screen.getByTestId('keyboard-frame');
  const height = inScreen ? 800 - 24 - 40 : 800;
  await fireEvent(view, 'layout', { persist: () => undefined, nativeEvent: { layout: { x: 0, y: 0, width: 400, height } } });
  return view;
}

// What RN reports: Android's screenY is the keyboard's top (ReactRootView: visible frame bottom,
// above the navigation bar), iOS the keyboard's top too; height on Android leaves the bar out.
async function keyboard(show: boolean) {
  const screenY = show ? 800 - 24 - KEYBOARD : 800;
  const endCoordinates = { screenX: 0, screenY, width: 400, height: show ? KEYBOARD : 0 };
  const name = Platform.OS === 'ios' ? (show ? 'keyboardWillShow' : 'keyboardWillHide') : show ? 'keyboardDidShow' : 'keyboardDidHide';
  await act(async () => {
    DeviceEventEmitter.emit(name, { endCoordinates, duration: 0, easing: 'keyboard' });
    await Promise.resolve();
  });
}

const os = Platform.OS;
afterEach(() => {
  Platform.OS = os;
});

test.each(['ios', 'android'] as const)('%s: padding, offset by where the frame’s parent starts', (platform) => {
  Platform.OS = platform;
  expect(keyboardAvoidProps(40)).toEqual({ behavior: 'padding', keyboardVerticalOffset: 40 });
});

test.each(['ios', 'android'] as const)('%s: keyboard closed, no padding (nothing moves, no gap)', async (platform) => {
  Platform.OS = platform;
  const view = await frame();
  expect(view).toHaveStyle({ paddingBottom: 0 });
});

test.each(['ios', 'android'] as const)('%s: keyboard open, the frame’s bottom sits on the keyboard', async (platform) => {
  Platform.OS = platform;
  const view = await frame();
  await keyboard(true);
  // The frame ends at the bottom safe area (40 + 736 = 776 in the window), the keyboard's top is at
  // 476: 300 = 776 − 476. Without the 40pt offset it would be 260, the composer 40pt under the keyboard.
  expect(view).toHaveStyle({ paddingBottom: KEYBOARD });
  await keyboard(false);
  expect(view).toHaveStyle({ paddingBottom: 0 });
});

test('a route root (login) starts at the window’s top: no offset, it clears the bar too', async () => {
  Platform.OS = 'android';
  const view = await frame(false);
  await keyboard(true);
  expect(view).toHaveStyle({ paddingBottom: 800 - (800 - 24 - KEYBOARD) });
});
