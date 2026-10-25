import { render, screen } from '@testing-library/react-native';
import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import type { ReactElement } from 'react';
import { Text } from 'react-native';
import { Screen } from './Screen';

// The floating tab bar reaches 100pt up from the screen's bottom here (its gap + the capsule).
const underBar = (ui: ReactElement) =>
  render(<BottomTabBarHeightContext.Provider value={100}>{ui}</BottomTabBarHeightContext.Provider>);
const row = <Text>row</Text>;

test('default: the content stops above the bar, so nothing is ever covered', async () => {
  await underBar(<Screen>{row}</Screen>);
  expect(screen.getByTestId('screen-body')).toHaveStyle({ paddingBottom: 100 });
});

test('list: the frame adds nothing, its list runs under the bar and pads itself', async () => {
  await underBar(<Screen list>{row}</Screen>);
  expect(screen.getByTestId('screen-body')).toHaveStyle({ paddingBottom: 0 });
});

test('scroll: the rows run under the bar and the last one ends 24pt above it', async () => {
  await underBar(<Screen scroll>{row}</Screen>);
  expect(screen.getByTestId('screen-scroll').props.contentContainerStyle).toMatchObject({ paddingBottom: 124 });
});

test('chat: no bar inset (a chat hides the bar)', async () => {
  await underBar(<Screen chat>{row}</Screen>);
  expect(screen.getByTestId('screen-body')).toHaveStyle({ paddingBottom: 0 });
});

test('sheet: a page sheet opened from a tab has no bar over it, so no inset (context crosses <Modal>)', async () => {
  await underBar(<Screen sheet>{row}</Screen>);
  expect(screen.getByTestId('screen-body')).toHaveStyle({ paddingBottom: 0 });
});

test('outside the tabs (login, a test) there is no bar to clear', async () => {
  await render(<Screen>{row}</Screen>);
  expect(screen.getByTestId('screen-body')).toHaveStyle({ paddingBottom: 0 });
});
