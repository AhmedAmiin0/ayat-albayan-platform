import { render, within } from '@testing-library/react-native';
import { Platform, Text } from 'react-native';
import { keyboardAt, laidOut } from '../../../testing/keyboard-fake';
import { MenuSheet } from './MenuSheet';

// A Modal's root starts at the window's top: a 400 × 800 window, the keyboard's top at 500.
async function sheet() {
  await render(
    <MenuSheet open label="menu" testID="menu" onClose={() => undefined}>
      <Text>edit field</Text>
    </MenuSheet>,
  );
  return laidOut('menu-keyboard');
}

const os = Platform.OS;
afterEach(async () => {
  Platform.OS = os;
  await keyboardAt(null);
});

test.each(['ios', 'android'] as const)('%s: the sheet rises onto the keyboard', async (os) => {
  Platform.OS = os;
  const frame = await sheet();
  expect(within(frame).getByTestId('menu')).toBeTruthy();
  expect(within(frame).getByText('edit field')).toBeTruthy();
  await keyboardAt(500);
  expect(frame).toHaveStyle({ paddingBottom: 300 });
  await keyboardAt(null);
  expect(frame).toHaveStyle({ paddingBottom: 0 });
});

test('no keyboard: the sheet sits on the window’s bottom', async () => {
  const frame = await sheet();
  expect(frame).toHaveStyle({ paddingBottom: 0, justifyContent: 'flex-end' });
});
