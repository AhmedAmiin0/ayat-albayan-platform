import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { keyboardAt } from '../../../../testing/keyboard-fake';
import { KeyboardFrame, keyboardAvoidProps } from '../KeyboardFrame';

// A 400 × 800 window, 40pt status bar, 24pt navigation bar / home indicator; the frame's parent
// (the Screen body) starts under the status bar, and the frame ends at 736 = 800 − 24 − 40 in it.
const metrics = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 40, bottom: 24, left: 0, right: 0 },
};
const KEYBOARD = 300;
const KEYBOARD_TOP = 800 - 24 - KEYBOARD;

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
  const layout = { x: 0, y: 0, width: 400, height };
  await fireEvent(view, 'layout', { persist: () => undefined, nativeEvent: { layout } });
  return view;
}

const os = Platform.OS;
afterEach(async () => {
  Platform.OS = os;
  await keyboardAt(null);
});

test.each(['ios', 'android'] as const)('%s: padding, offset by where the parent starts', (os) => {
  Platform.OS = os;
  expect(keyboardAvoidProps(40)).toEqual({ behavior: 'padding', keyboardVerticalOffset: 40 });
});

test.each(['ios', 'android'] as const)('%s: keyboard closed, no padding (no gap)', async (os) => {
  Platform.OS = os;
  const view = await frame();
  expect(view).toHaveStyle({ paddingBottom: 0 });
});

test.each(['ios', 'android'] as const)('%s: keyboard open, the bottom sits on it', async (os) => {
  Platform.OS = os;
  const view = await frame();
  await keyboardAt(KEYBOARD_TOP);
  // The frame ends at the bottom safe area (40 + 736 = 776 in the window), the keyboard's top is at
  // 476: 300 = 776 − 476. Without the 40pt offset it would be 260, the composer 40pt under it.
  expect(view).toHaveStyle({ paddingBottom: KEYBOARD });
  await keyboardAt(null);
  expect(view).toHaveStyle({ paddingBottom: 0 });
});

test('a route root (login) starts at the window’s top: no offset, it clears the bar too', async () => {
  Platform.OS = 'android';
  const view = await frame(false);
  await keyboardAt(KEYBOARD_TOP);
  expect(view).toHaveStyle({ paddingBottom: 800 - KEYBOARD_TOP });
});

test('a second frame on screen (a sheet) takes its own test id', async () => {
  await render(
    <KeyboardFrame inScreen={false} testID="sheet-frame">
      <Text>field</Text>
    </KeyboardFrame>,
  );
  expect(screen.getByTestId('sheet-frame')).toBeTruthy();
  expect(screen.queryByTestId('keyboard-frame')).toBeNull();
});
